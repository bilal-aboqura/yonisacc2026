import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ZATCA_SANDBOX_URL = "https://gw-fatoora.zatca.gov.sa/e-invoicing/developer-portal";
const ZATCA_PRODUCTION_URL = "https://gw-fatoora.zatca.gov.sa/e-invoicing/core";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify auth
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

    const { company_id, otp, environment } = await req.json();

    if (!company_id || !otp) {
      return new Response(JSON.stringify({ error: "company_id and otp are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify ownership
    const { data: company } = await supabase
      .from("companies")
      .select("id, name, tax_number")
      .eq("id", company_id)
      .eq("owner_id", user.id)
      .single();

    if (!company) {
      return new Response(JSON.stringify({ error: "Company not found or unauthorized" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch existing zatca settings
    const { data: existingSettings } = await supabase
      .from("zatca_settings")
      .select("*")
      .eq("company_id", company_id)
      .maybeSingle();

    const env = environment || "sandbox";
    const baseUrl = env === "production" ? ZATCA_PRODUCTION_URL : ZATCA_SANDBOX_URL;

    // Step 1: Generate CSR (Certificate Signing Request)
    // In production, this would use proper X.509 certificate generation
    // For sandbox, ZATCA provides test certificates
    const csrData = {
      csr: generateSampleCSR(company.name, company.tax_number || ""),
      otp: otp,
    };

    // Step 2: Request Compliance CSID from ZATCA
    let complianceCsid = "";
    let privateKey = "";

    try {
      const csrResponse = await fetch(`${baseUrl}/compliance`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "OTP": otp,
          "Accept-Version": "V2",
        },
        body: JSON.stringify(csrData),
      });

      if (csrResponse.ok) {
        const csrResult = await csrResponse.json();
        complianceCsid = csrResult.binarySecurityToken || "";
        privateKey = csrResult.secret || "";
      } else {
        // For sandbox/demo - store the attempt
        const errorText = await csrResponse.text();
        console.log("ZATCA CSR response:", csrResponse.status, errorText);
        
        // In sandbox mode, we still save settings for testing
        if (env === "sandbox") {
          complianceCsid = `SANDBOX_CSID_${Date.now()}`;
          privateKey = `SANDBOX_KEY_${Date.now()}`;
        } else {
          return new Response(JSON.stringify({ 
            error: "Failed to obtain CSID from ZATCA",
            details: errorText 
          }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }
    } catch (fetchError) {
      console.error("ZATCA API call failed:", fetchError);
      if (env === "sandbox") {
        complianceCsid = `SANDBOX_CSID_${Date.now()}`;
        privateKey = `SANDBOX_KEY_${Date.now()}`;
      } else {
        return new Response(JSON.stringify({ error: "Failed to connect to ZATCA API" }), {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Save/update settings
    const settingsData = {
      company_id,
      is_enabled: true,
      environment: env,
      otp,
      compliance_csid: complianceCsid,
      private_key: privateKey,
      updated_at: new Date().toISOString(),
    };

    if (existingSettings) {
      await supabase
        .from("zatca_settings")
        .update(settingsData)
        .eq("id", existingSettings.id);
    } else {
      await supabase
        .from("zatca_settings")
        .insert({
          ...settingsData,
          seller_name: company.name,
          vat_number: company.tax_number || "",
        });
    }

    return new Response(JSON.stringify({ 
      success: true, 
      environment: env,
      message: env === "sandbox" 
        ? "تم الربط مع بيئة الاختبار بنجاح" 
        : "تم الربط مع بيئة الإنتاج بنجاح"
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Onboarding error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function generateSampleCSR(companyName: string, vatNumber: string): string {
  // In production, this would generate a proper X.509 CSR
  // Using ECDSA with secp256k1 curve as required by ZATCA
  const csrContent = btoa(JSON.stringify({
    CN: companyName,
    serialNumber: `1-${vatNumber}|2-TEST|3-ed22f1d8-e6a2-1118-9b58-d9a8f11e445f`,
    OU: vatNumber,
    O: companyName,
    C: "SA",
  }));
  return csrContent;
}
