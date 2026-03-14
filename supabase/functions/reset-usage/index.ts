import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    // Get all active companies
    const { data: companies, error: compError } = await supabase
      .from("companies")
      .select("id")
      .is("deleted_at", null);

    if (compError) throw compError;

    let created = 0;
    for (const company of companies || []) {
      const { error } = await supabase
        .from("usage_tracking")
        .upsert(
          {
            company_id: company.id,
            year,
            month,
            journal_entries_count: 0,
            sales_invoices_count: 0,
            purchase_invoices_count: 0,
          },
          { onConflict: "company_id,year,month", ignoreDuplicates: true }
        );

      if (!error) created++;
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Reset usage for ${year}-${month}. ${created} companies processed.`,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
