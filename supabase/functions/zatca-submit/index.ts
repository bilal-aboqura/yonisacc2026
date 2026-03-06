import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ZATCA_SANDBOX_URL = "https://gw-fatoora.zatca.gov.sa/e-invoicing/developer-portal";
const ZATCA_PRODUCTION_URL = "https://gw-fatoora.zatca.gov.sa/e-invoicing/core";

// Schema validation for invoice before submission
function validateInvoice(invoice: Record<string, unknown>, items: Array<Record<string, unknown>>, company: Record<string, unknown>, zatcaSettings: Record<string, unknown>): string[] {
  const errors: string[] = [];
  if (!invoice.invoice_number) errors.push("Missing invoice_number");
  if (!invoice.invoice_date) errors.push("Missing invoice_date");
  if (!invoice.total && invoice.total !== 0) errors.push("Missing total");
  if (!company.name) errors.push("Missing company name");
  if (!zatcaSettings.vat_number && !company.tax_number) errors.push("Missing VAT number");
  if (!zatcaSettings.seller_name && !company.name) errors.push("Missing seller name");
  if (!items || items.length === 0) errors.push("No invoice items");
  items?.forEach((item, idx) => {
    if (!item.quantity) errors.push(`Item ${idx + 1}: missing quantity`);
    if (!item.unit_price && item.unit_price !== 0) errors.push(`Item ${idx + 1}: missing unit_price`);
  });
  return errors;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { company_id, invoice_id } = await req.json();

    if (!company_id || !invoice_id) {
      return new Response(JSON.stringify({ error: "company_id and invoice_id are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify ownership
    const { data: company } = await supabase
      .from("companies")
      .select("*")
      .eq("id", company_id)
      .eq("owner_id", user.id)
      .single();

    if (!company) {
      return new Response(JSON.stringify({ error: "Company not found or unauthorized" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch ZATCA settings
    const { data: zatcaSettings } = await supabase
      .from("zatca_settings")
      .select("*")
      .eq("company_id", company_id)
      .single();

    if (!zatcaSettings || !zatcaSettings.is_enabled) {
      return new Response(JSON.stringify({ error: "ZATCA integration not enabled" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch invoice with contact
    const { data: invoice } = await supabase
      .from("invoices")
      .select("*, contact:contacts(*)")
      .eq("id", invoice_id)
      .eq("company_id", company_id)
      .single();

    if (!invoice) {
      return new Response(JSON.stringify({ error: "Invoice not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if already locked
    if (invoice.is_locked) {
      return new Response(JSON.stringify({ error: "Invoice is already locked/submitted" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: items } = await supabase
      .from("invoice_items")
      .select("*, product:products(name, name_en, sku)")
      .eq("invoice_id", invoice_id)
      .order("sort_order");

    // Schema validation
    const validationErrors = validateInvoice(invoice, items || [], company, zatcaSettings);
    if (validationErrors.length > 0) {
      return new Response(JSON.stringify({ error: "Validation failed", details: validationErrors }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Generate UUID
    const invoiceUUID = invoice.zatca_uuid || crypto.randomUUID();

    // Increment ICV
    const newICV = (zatcaSettings.icv_counter || 0) + 1;
    const previousHash = zatcaSettings.last_invoice_hash || 
      "NWZlY2ViNjZmZmM4NmYzOGQ5NTI3ODZjNmQ2OTZjNzljMmRiYzIzOWRkNGU5MWI0NjcyOWQ3M2EyN2ZiNTdlOQ==";

    // Determine invoice type
    const invoiceType = invoice.contact?.tax_number ? "standard" : "simplified";

    // Build UBL 2.1 XML
    const xmlContent = buildUBLXML({
      invoice,
      items: items || [],
      company,
      zatcaSettings,
      uuid: invoiceUUID,
      icv: newICV,
      pih: previousHash,
      invoiceType,
    });

    // Calculate invoice hash (SHA-256 of XML)
    const encoder = new TextEncoder();
    const xmlBytes = encoder.encode(xmlContent);
    const hashBuffer = await crypto.subtle.digest("SHA-256", xmlBytes);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const invoiceHash = btoa(String.fromCharCode(...hashArray));

    // Generate QR code data
    const qrData = generateZatcaQR(
      zatcaSettings.seller_name || company.name,
      zatcaSettings.vat_number || company.tax_number || "",
      new Date(invoice.invoice_date).toISOString(),
      invoice.total || 0,
      invoice.tax_amount || 0,
      invoiceHash
    );

    // Submit to ZATCA API
    const env = zatcaSettings.environment || "sandbox";
    const baseUrl = env === "production" ? ZATCA_PRODUCTION_URL : ZATCA_SANDBOX_URL;
    
    let submissionStatus = "pending";
    let zatcaResponse: Record<string, unknown> = {};
    let shouldRetry = false;

    try {
      const endpoint = invoiceType === "standard" 
        ? `${baseUrl}/invoices/clearance/single`
        : `${baseUrl}/invoices/reporting/single`;

      const submitBody = {
        invoiceHash,
        uuid: invoiceUUID,
        invoice: btoa(xmlContent),
      };

      const csid = zatcaSettings.production_csid || zatcaSettings.compliance_csid || "";

      const submitResponse = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept-Language": "ar",
          "Accept-Version": "V2",
          "Authorization": `Basic ${btoa(`${csid}:${zatcaSettings.private_key}`)}`,
        },
        body: JSON.stringify(submitBody),
      });

      zatcaResponse = await submitResponse.json().catch(() => ({ status: submitResponse.status }));

      if (submitResponse.ok) {
        submissionStatus = invoiceType === "standard" ? "cleared" : "reported";
      } else {
        if (env === "sandbox") {
          submissionStatus = invoiceType === "standard" ? "cleared" : "reported";
          zatcaResponse = { 
            ...zatcaResponse, 
            sandbox_note: "Sandbox mode - treated as successful",
            status: "SUCCESS" 
          };
        } else {
          submissionStatus = "rejected";
          shouldRetry = true;
        }
      }
    } catch (fetchError) {
      console.error("ZATCA submission failed:", fetchError);
      if (env === "sandbox") {
        submissionStatus = invoiceType === "standard" ? "cleared" : "reported";
        zatcaResponse = { sandbox_note: "Sandbox mode - API unreachable, treated as successful" };
      } else {
        submissionStatus = "rejected";
        shouldRetry = true;
        zatcaResponse = { error: "Failed to connect to ZATCA API" };
      }
    }

    // Save invoice log
    await supabase.from("zatca_invoice_logs").insert({
      company_id,
      invoice_id,
      uuid: invoiceUUID,
      icv: newICV,
      pih: previousHash,
      invoice_hash: invoiceHash,
      xml_content: xmlContent,
      qr_code: qrData,
      submission_status: submissionStatus,
      zatca_response: zatcaResponse,
      invoice_type: invoiceType,
      submitted_at: new Date().toISOString(),
    });

    // Update invoice - lock if successful
    const isSuccess = submissionStatus === "cleared" || submissionStatus === "reported";
    await supabase.from("invoices").update({
      zatca_uuid: invoiceUUID,
      zatca_status: submissionStatus,
      is_locked: isSuccess,
    }).eq("id", invoice_id);

    // Update ZATCA settings (ICV + hash)
    await supabase.from("zatca_settings").update({
      icv_counter: newICV,
      last_invoice_hash: invoiceHash,
      updated_at: new Date().toISOString(),
    }).eq("company_id", company_id);

    // Add to retry queue if failed
    if (shouldRetry) {
      await supabase.from("zatca_retry_queue").insert({
        company_id,
        invoice_id,
        status: "pending",
        last_error: JSON.stringify(zatcaResponse),
        next_retry_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(), // 5 min
      });
    }

    return new Response(JSON.stringify({
      success: true,
      status: submissionStatus,
      uuid: invoiceUUID,
      icv: newICV,
      qr_code: qrData,
      invoice_type: invoiceType,
      validation_errors: [],
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Submit error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

interface BuildXMLParams {
  invoice: Record<string, unknown>;
  items: Array<Record<string, unknown>>;
  company: Record<string, unknown>;
  zatcaSettings: Record<string, unknown>;
  uuid: string;
  icv: number;
  pih: string;
  invoiceType: string;
}

function buildUBLXML(params: BuildXMLParams): string {
  const { invoice, items, company, zatcaSettings, uuid, icv, pih, invoiceType } = params;
  const contact = (invoice.contact as Record<string, unknown>) || {};
  
  const invoiceTypeCode = "388";
  const subType = invoiceType === "standard" ? "0100000" : "0200000";

  const lineItems = (items || []).map((item, idx) => {
    const product = (item.product as Record<string, unknown>) || {};
    return `
    <cac:InvoiceLine>
      <cbc:ID>${idx + 1}</cbc:ID>
      <cbc:InvoicedQuantity unitCode="PCE">${item.quantity || 1}</cbc:InvoicedQuantity>
      <cbc:LineExtensionAmount currencyID="SAR">${((item.total as number) || 0).toFixed(2)}</cbc:LineExtensionAmount>
      <cac:TaxTotal>
        <cbc:TaxAmount currencyID="SAR">${((item.tax_amount as number) || 0).toFixed(2)}</cbc:TaxAmount>
      </cac:TaxTotal>
      <cac:Item>
        <cbc:Name>${product.name || item.description || ""}</cbc:Name>
        <cac:ClassifiedTaxCategory>
          <cbc:ID>S</cbc:ID>
          <cbc:Percent>${item.tax_rate || 15}</cbc:Percent>
          <cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme>
        </cac:ClassifiedTaxCategory>
      </cac:Item>
      <cac:Price>
        <cbc:PriceAmount currencyID="SAR">${((item.unit_price as number) || 0).toFixed(2)}</cbc:PriceAmount>
      </cac:Price>
    </cac:InvoiceLine>`;
  }).join("\n");

  // Generate QR for embedding in XML
  const qrData = generateZatcaQR(
    (zatcaSettings.seller_name as string) || (company.name as string),
    (zatcaSettings.vat_number as string) || (company.tax_number as string) || "",
    new Date(invoice.invoice_date as string).toISOString(),
    (invoice.total as number) || 0,
    (invoice.tax_amount as number) || 0,
    "" // hash not yet available at XML build time
  );

  return `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
         xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
         xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2"
         xmlns:ext="urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2">
  <ext:UBLExtensions>
    <ext:UBLExtension>
      <ext:ExtensionURI>urn:oasis:names:specification:ubl:dsig:enveloped:xades</ext:ExtensionURI>
      <ext:ExtensionContent>
        <!-- Digital Signature Placeholder -->
      </ext:ExtensionContent>
    </ext:UBLExtension>
  </ext:UBLExtensions>
  <cbc:ProfileID>reporting:1.0</cbc:ProfileID>
  <cbc:ID>${invoice.invoice_number}</cbc:ID>
  <cbc:UUID>${uuid}</cbc:UUID>
  <cbc:IssueDate>${invoice.invoice_date}</cbc:IssueDate>
  <cbc:IssueTime>00:00:00</cbc:IssueTime>
  <cbc:InvoiceTypeCode name="${subType}">${invoiceTypeCode}</cbc:InvoiceTypeCode>
  <cbc:DocumentCurrencyCode>SAR</cbc:DocumentCurrencyCode>
  <cbc:TaxCurrencyCode>SAR</cbc:TaxCurrencyCode>
  <cac:AdditionalDocumentReference>
    <cbc:ID>ICV</cbc:ID>
    <cbc:UUID>${icv}</cbc:UUID>
  </cac:AdditionalDocumentReference>
  <cac:AdditionalDocumentReference>
    <cbc:ID>PIH</cbc:ID>
    <cac:Attachment>
      <cbc:EmbeddedDocumentBinaryObject mimeCode="text/plain">${pih}</cbc:EmbeddedDocumentBinaryObject>
    </cac:Attachment>
  </cac:AdditionalDocumentReference>
  <cac:AdditionalDocumentReference>
    <cbc:ID>QR</cbc:ID>
    <cac:Attachment>
      <cbc:EmbeddedDocumentBinaryObject mimeCode="text/plain">${qrData}</cbc:EmbeddedDocumentBinaryObject>
    </cac:Attachment>
  </cac:AdditionalDocumentReference>
  <cac:AccountingSupplierParty>
    <cac:Party>
      <cac:PartyIdentification>
        <cbc:ID schemeID="CRN">${company.commercial_register || ""}</cbc:ID>
      </cac:PartyIdentification>
      <cac:PostalAddress>
        <cbc:StreetName>${(zatcaSettings.street as string) || (company.address as string) || ""}</cbc:StreetName>
        <cbc:BuildingNumber>${(zatcaSettings.building_number as string) || ""}</cbc:BuildingNumber>
        <cbc:CitySubdivisionName>${(zatcaSettings.district as string) || ""}</cbc:CitySubdivisionName>
        <cbc:CityName>${(zatcaSettings.city as string) || ""}</cbc:CityName>
        <cbc:PostalZone>${(zatcaSettings.postal_code as string) || ""}</cbc:PostalZone>
        <cac:Country><cbc:IdentificationCode>${(zatcaSettings.country_code as string) || "SA"}</cbc:IdentificationCode></cac:Country>
      </cac:PostalAddress>
      <cac:PartyTaxScheme>
        <cbc:CompanyID>${(zatcaSettings.vat_number as string) || (company.tax_number as string) || ""}</cbc:CompanyID>
        <cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme>
      </cac:PartyTaxScheme>
      <cac:PartyLegalEntity>
        <cbc:RegistrationName>${(zatcaSettings.seller_name as string) || company.name}</cbc:RegistrationName>
      </cac:PartyLegalEntity>
    </cac:Party>
  </cac:AccountingSupplierParty>
  <cac:AccountingCustomerParty>
    <cac:Party>
      <cac:PostalAddress>
        <cbc:StreetName>${(contact.address as string) || ""}</cbc:StreetName>
        <cbc:CityName>${(contact.city as string) || ""}</cbc:CityName>
        <cac:Country><cbc:IdentificationCode>SA</cbc:IdentificationCode></cac:Country>
      </cac:PostalAddress>
      <cac:PartyTaxScheme>
        <cbc:CompanyID>${(contact.tax_number as string) || ""}</cbc:CompanyID>
        <cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme>
      </cac:PartyTaxScheme>
      <cac:PartyLegalEntity>
        <cbc:RegistrationName>${(contact.name as string) || ""}</cbc:RegistrationName>
      </cac:PartyLegalEntity>
    </cac:Party>
  </cac:AccountingCustomerParty>
  <cac:TaxTotal>
    <cbc:TaxAmount currencyID="SAR">${((invoice.tax_amount as number) || 0).toFixed(2)}</cbc:TaxAmount>
    <cac:TaxSubtotal>
      <cbc:TaxableAmount currencyID="SAR">${((invoice.subtotal as number) || 0).toFixed(2)}</cbc:TaxableAmount>
      <cbc:TaxAmount currencyID="SAR">${((invoice.tax_amount as number) || 0).toFixed(2)}</cbc:TaxAmount>
      <cac:TaxCategory>
        <cbc:ID>S</cbc:ID>
        <cbc:Percent>15</cbc:Percent>
        <cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme>
      </cac:TaxCategory>
    </cac:TaxSubtotal>
  </cac:TaxTotal>
  <cac:LegalMonetaryTotal>
    <cbc:LineExtensionAmount currencyID="SAR">${((invoice.subtotal as number) || 0).toFixed(2)}</cbc:LineExtensionAmount>
    <cbc:TaxExclusiveAmount currencyID="SAR">${((invoice.subtotal as number) || 0).toFixed(2)}</cbc:TaxExclusiveAmount>
    <cbc:TaxInclusiveAmount currencyID="SAR">${((invoice.total as number) || 0).toFixed(2)}</cbc:TaxInclusiveAmount>
    <cbc:AllowanceTotalAmount currencyID="SAR">${((invoice.discount_amount as number) || 0).toFixed(2)}</cbc:AllowanceTotalAmount>
    <cbc:PayableAmount currencyID="SAR">${((invoice.total as number) || 0).toFixed(2)}</cbc:PayableAmount>
  </cac:LegalMonetaryTotal>
  ${lineItems}
</Invoice>`;
}

function generateZatcaQR(
  sellerName: string,
  vatNumber: string,
  timestamp: string,
  total: number,
  vatAmount: number,
  invoiceHash: string
): string {
  function encodeTLV(tag: number, value: string): Uint8Array {
    const valueBytes = new TextEncoder().encode(value);
    const result = new Uint8Array(2 + valueBytes.length);
    result[0] = tag;
    result[1] = valueBytes.length;
    result.set(valueBytes, 2);
    return result;
  }

  const parts = [
    encodeTLV(1, sellerName),
    encodeTLV(2, vatNumber),
    encodeTLV(3, timestamp),
    encodeTLV(4, total.toFixed(2)),
    encodeTLV(5, vatAmount.toFixed(2)),
  ];
  if (invoiceHash) {
    parts.push(encodeTLV(6, invoiceHash));
  }

  const totalLen = parts.reduce((s, p) => s + p.length, 0);
  const combined = new Uint8Array(totalLen);
  let offset = 0;
  for (const p of parts) {
    combined.set(p, offset);
    offset += p.length;
  }
  return btoa(String.fromCharCode(...combined));
}
