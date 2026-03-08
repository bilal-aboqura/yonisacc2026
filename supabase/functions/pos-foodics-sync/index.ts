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

    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claims?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { integration_id, action } = body;

    if (!integration_id) {
      return new Response(JSON.stringify({ error: "integration_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get integration with Foodics settings
    const { data: integration, error: intError } = await supabase
      .from("pos_api_integrations")
      .select("*")
      .eq("id", integration_id)
      .eq("provider", "foodics")
      .single();

    if (intError || !integration) {
      return new Response(JSON.stringify({ error: "Foodics integration not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const settings = integration.settings as Record<string, unknown> || {};
    const foodicsToken = settings.foodics_api_token as string;
    const businessId = settings.foodics_business_id as string;

    if (!foodicsToken) {
      return new Response(JSON.stringify({ error: "Foodics API token not configured" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "pull_orders") {
      // Pull recent orders from Foodics API
      const since = body.since || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      
      const foodicsRes = await fetch(
        `https://api.foodics.com/v5/orders?filter[updated_after]=${since}&include=products,customer`,
        {
          headers: {
            Authorization: `Bearer ${foodicsToken}`,
            Accept: "application/json",
            ...(businessId ? { "X-business": businessId } : {}),
          },
        }
      );

      if (!foodicsRes.ok) {
        const errText = await foodicsRes.text();
        await supabase.from("pos_api_logs").insert({
          integration_id: integration.id,
          event: "sync_error",
          payload: { status: foodicsRes.status, error: errText },
        });
        return new Response(
          JSON.stringify({ error: "Foodics API error", details: errText }),
          { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const foodicsData = await foodicsRes.json();
      const orders = foodicsData.data || [];
      let imported = 0;

      for (const order of orders) {
        // Check if already imported
        const { data: existing } = await supabase
          .from("pos_api_orders")
          .select("id")
          .eq("integration_id", integration.id)
          .eq("external_order_id", order.reference || order.id)
          .maybeSingle();

        if (existing) continue;

        const customer = order.customer || {};
        const products = order.products || [];

        await supabase.from("pos_api_orders").insert({
          company_id: integration.company_id,
          integration_id: integration.id,
          external_order_id: order.reference || order.id,
          provider: "foodics",
          status: integration.auto_accept_orders ? "accepted" : "pending",
          order_data: order,
          customer_name: customer.name || "",
          customer_phone: customer.phone || "",
          customer_address: order.address?.description || "",
          items: products.map((p: Record<string, unknown>) => ({
            name: p.name,
            quantity: p.quantity || 1,
            unit_price: p.price || 0,
            total: p.total_price || 0,
            sku: p.sku || null,
          })),
          subtotal: order.subtotal_price || 0,
          tax_amount: order.total_tax || 0,
          delivery_fee: order.delivery_price || 0,
          discount_amount: order.discount_amount || 0,
          total: order.total_price || 0,
          notes: order.notes || "",
          accepted_at: integration.auto_accept_orders ? new Date().toISOString() : null,
        });
        imported++;
      }

      await supabase.from("pos_api_logs").insert({
        integration_id: integration.id,
        event: "sync_completed",
        payload: { total_fetched: orders.length, imported },
      });

      return new Response(
        JSON.stringify({ success: true, total_fetched: orders.length, imported }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "test_connection") {
      const testRes = await fetch("https://api.foodics.com/v5/whoami", {
        headers: {
          Authorization: `Bearer ${foodicsToken}`,
          Accept: "application/json",
          ...(businessId ? { "X-business": businessId } : {}),
        },
      });

      const testData = await testRes.json();
      return new Response(
        JSON.stringify({ success: testRes.ok, data: testData }),
        { status: testRes.ok ? 200 : 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Foodics sync error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
