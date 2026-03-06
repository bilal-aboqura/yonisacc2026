import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch pending retries that are due
    const { data: pendingRetries, error: fetchError } = await supabase
      .from("zatca_retry_queue")
      .select("*")
      .eq("status", "pending")
      .lte("next_retry_at", new Date().toISOString())
      .order("next_retry_at")
      .limit(10);

    if (fetchError) throw fetchError;
    if (!pendingRetries || pendingRetries.length === 0) {
      return new Response(JSON.stringify({ message: "No pending retries", processed: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let processed = 0;
    let succeeded = 0;

    for (const retry of pendingRetries) {
      // Mark as processing
      await supabase.from("zatca_retry_queue").update({ status: "processing" }).eq("id", retry.id);

      try {
        // Call zatca-submit internally
        const submitUrl = `${supabaseUrl}/functions/v1/zatca-submit`;
        const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || supabaseKey;

        // Get a service-level token by creating a temporary admin context
        const { data: company } = await supabase
          .from("companies")
          .select("owner_id")
          .eq("id", retry.company_id)
          .single();

        if (!company) {
          await supabase.from("zatca_retry_queue").update({
            status: "failed",
            last_error: "Company not found",
            retry_count: retry.retry_count + 1,
          }).eq("id", retry.id);
          continue;
        }

        // Use service role to submit directly
        const { data: invoice } = await supabase
          .from("invoices")
          .select("*, contact:contacts(*)")
          .eq("id", retry.invoice_id)
          .single();

        if (!invoice || invoice.is_locked) {
          await supabase.from("zatca_retry_queue").update({
            status: invoice?.is_locked ? "completed" : "failed",
            last_error: invoice?.is_locked ? "Already submitted" : "Invoice not found",
          }).eq("id", retry.id);
          continue;
        }

        const { data: zatcaSettings } = await supabase
          .from("zatca_settings")
          .select("*")
          .eq("company_id", retry.company_id)
          .single();

        if (!zatcaSettings?.is_enabled) {
          await supabase.from("zatca_retry_queue").update({
            status: "failed",
            last_error: "ZATCA not enabled",
          }).eq("id", retry.id);
          continue;
        }

        // Direct ZATCA API call
        const ZATCA_SANDBOX_URL = "https://gw-fatoora.zatca.gov.sa/e-invoicing/developer-portal";
        const ZATCA_PRODUCTION_URL = "https://gw-fatoora.zatca.gov.sa/e-invoicing/core";
        const env = zatcaSettings.environment || "sandbox";
        const baseUrl = env === "production" ? ZATCA_PRODUCTION_URL : ZATCA_SANDBOX_URL;

        // Get latest log for this invoice to get the XML
        const { data: lastLog } = await supabase
          .from("zatca_invoice_logs")
          .select("*")
          .eq("invoice_id", retry.invoice_id)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        if (!lastLog?.xml_content) {
          await supabase.from("zatca_retry_queue").update({
            status: "failed",
            last_error: "No XML content found",
          }).eq("id", retry.id);
          continue;
        }

        const invoiceType = lastLog.invoice_type || "simplified";
        const endpoint = invoiceType === "standard"
          ? `${baseUrl}/invoices/clearance/single`
          : `${baseUrl}/invoices/reporting/single`;

        const csid = zatcaSettings.production_csid || zatcaSettings.compliance_csid || "";

        const submitResponse = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Accept-Language": "ar",
            "Accept-Version": "V2",
            "Authorization": `Basic ${btoa(`${csid}:${zatcaSettings.private_key}`)}`,
          },
          body: JSON.stringify({
            invoiceHash: lastLog.invoice_hash,
            uuid: lastLog.uuid,
            invoice: btoa(lastLog.xml_content),
          }),
        });

        const responseData = await submitResponse.json().catch(() => ({ status: submitResponse.status }));

        if (submitResponse.ok) {
          const newStatus = invoiceType === "standard" ? "cleared" : "reported";
          
          // Update invoice
          await supabase.from("invoices").update({
            zatca_status: newStatus,
            is_locked: true,
          }).eq("id", retry.invoice_id);

          // Update log
          await supabase.from("zatca_invoice_logs").update({
            submission_status: newStatus,
            zatca_response: responseData,
          }).eq("id", lastLog.id);

          // Mark retry as completed
          await supabase.from("zatca_retry_queue").update({
            status: "completed",
          }).eq("id", retry.id);

          succeeded++;
        } else {
          const newRetryCount = retry.retry_count + 1;
          if (newRetryCount >= retry.max_retries) {
            await supabase.from("zatca_retry_queue").update({
              status: "failed",
              retry_count: newRetryCount,
              last_error: JSON.stringify(responseData),
            }).eq("id", retry.id);
          } else {
            // Exponential backoff: 5min, 15min, 45min, 2h, 6h
            const backoffMinutes = 5 * Math.pow(3, newRetryCount);
            await supabase.from("zatca_retry_queue").update({
              status: "pending",
              retry_count: newRetryCount,
              last_error: JSON.stringify(responseData),
              next_retry_at: new Date(Date.now() + backoffMinutes * 60 * 1000).toISOString(),
            }).eq("id", retry.id);
          }
        }

        processed++;
      } catch (retryError) {
        console.error(`Retry failed for ${retry.id}:`, retryError);
        const newRetryCount = retry.retry_count + 1;
        await supabase.from("zatca_retry_queue").update({
          status: newRetryCount >= retry.max_retries ? "failed" : "pending",
          retry_count: newRetryCount,
          last_error: String(retryError),
          next_retry_at: new Date(Date.now() + 5 * 60 * 1000 * Math.pow(3, newRetryCount)).toISOString(),
        }).eq("id", retry.id);
      }
    }

    return new Response(JSON.stringify({ processed, succeeded }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Retry error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
