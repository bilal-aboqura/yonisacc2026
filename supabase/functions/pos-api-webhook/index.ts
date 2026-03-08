import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-api-key",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get API key from header
    const apiKey = req.headers.get("x-api-key");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "Missing x-api-key header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate API key and get integration
    const { data: integration, error: intError } = await supabase
      .from("pos_api_integrations")
      .select("*")
      .eq("api_key", apiKey)
      .eq("is_active", true)
      .maybeSingle();

    if (intError || !integration) {
      return new Response(
        JSON.stringify({ error: "Invalid or inactive API key" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();

    // Normalize order data based on provider
    const orderData = normalizeOrder(integration.provider, body);

    // Insert order
    const { data: order, error: orderError } = await supabase
      .from("pos_api_orders")
      .insert({
        company_id: integration.company_id,
        integration_id: integration.id,
        external_order_id: orderData.external_order_id,
        provider: integration.provider,
        status: integration.auto_accept_orders ? "accepted" : "pending",
        order_data: body,
        customer_name: orderData.customer_name,
        customer_phone: orderData.customer_phone,
        customer_address: orderData.customer_address,
        items: orderData.items,
        subtotal: orderData.subtotal,
        tax_amount: orderData.tax_amount,
        delivery_fee: orderData.delivery_fee,
        discount_amount: orderData.discount_amount,
        total: orderData.total,
        notes: orderData.notes,
        accepted_at: integration.auto_accept_orders ? new Date().toISOString() : null,
      })
      .select()
      .single();

    if (orderError) {
      console.error("Order insert error:", orderError);
      // Log the error
      await supabase.from("pos_api_logs").insert({
        integration_id: integration.id,
        event: "sync_error",
        payload: { error: orderError.message, body },
      });
      return new Response(
        JSON.stringify({ error: "Failed to create order" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Log successful receipt
    await supabase.from("pos_api_logs").insert({
      integration_id: integration.id,
      order_id: order.id,
      event: "order_received",
      payload: { external_order_id: orderData.external_order_id, auto_accepted: integration.auto_accept_orders },
    });

    return new Response(
      JSON.stringify({
        success: true,
        order_id: order.id,
        status: order.status,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Webhook error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

interface NormalizedOrder {
  external_order_id: string;
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  items: unknown[];
  subtotal: number;
  tax_amount: number;
  delivery_fee: number;
  discount_amount: number;
  total: number;
  notes: string;
}

function normalizeOrder(provider: string, body: Record<string, unknown>): NormalizedOrder {
  switch (provider) {
    case "foodics":
      return normalizeFoodicsOrder(body);
    default:
      return normalizeGenericOrder(body);
  }
}

function normalizeFoodicsOrder(body: Record<string, unknown>): NormalizedOrder {
  const order = (body.order || body.data || body) as Record<string, unknown>;
  const customer = (order.customer || {}) as Record<string, unknown>;
  const address = (order.address || customer.address || {}) as Record<string, unknown>;
  const products = (order.products || order.items || []) as Record<string, unknown>[];

  return {
    external_order_id: String(order.reference || order.id || ""),
    customer_name: String(customer.name || order.customer_name || ""),
    customer_phone: String(customer.phone || customer.dial_code || ""),
    customer_address: String(address.description || address.address || ""),
    items: products.map((p) => ({
      name: p.name || p.product_name,
      quantity: p.quantity || 1,
      unit_price: p.price || p.unit_price || 0,
      total: p.total_price || p.total || 0,
      sku: p.sku || p.barcode || null,
      options: p.options || p.modifiers || [],
    })),
    subtotal: Number(order.subtotal_price || order.subtotal || 0),
    tax_amount: Number(order.total_tax || order.tax_amount || 0),
    delivery_fee: Number(order.delivery_price || order.delivery_fee || 0),
    discount_amount: Number(order.discount_amount || 0),
    total: Number(order.total_price || order.total || 0),
    notes: String(order.notes || order.kitchen_notes || ""),
  };
}

function normalizeGenericOrder(body: Record<string, unknown>): NormalizedOrder {
  return {
    external_order_id: String(body.order_id || body.external_id || body.reference || ""),
    customer_name: String(body.customer_name || ""),
    customer_phone: String(body.customer_phone || ""),
    customer_address: String(body.customer_address || body.delivery_address || ""),
    items: Array.isArray(body.items) ? body.items : [],
    subtotal: Number(body.subtotal || 0),
    tax_amount: Number(body.tax_amount || body.tax || 0),
    delivery_fee: Number(body.delivery_fee || 0),
    discount_amount: Number(body.discount_amount || body.discount || 0),
    total: Number(body.total || 0),
    notes: String(body.notes || ""),
  };
}
