import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": Deno.env.get("ALLOWED_ORIGIN") || "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// ---------- helpers ----------

function hmacSha256Hex(secret: string, message: string): string {
  const enc = new TextEncoder();
  const keyData = enc.encode(secret);
  const msgData = enc.encode(message);

  // Deno built-in crypto  — works in Supabase Edge Functions
  const key = new Uint8Array(keyData);
  const msg = new Uint8Array(msgData);

  // Use Web Crypto API
  // We need to do this synchronously-ish, so we'll use a manual HMAC
  // Actually in Deno we can use the std library or crypto.subtle
  // For edge functions, let's use a simple approach
  return ""; // placeholder — replaced below with async version
}

async function hmacSha256HexAsync(
  secret: string,
  message: string
): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// ---------- main handler ----------

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // ── 1. Auth ──────────────────────────────────────────────
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const anonClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } =
      await anonClient.auth.getUser(token);
    if (userError || !userData?.user) {
      return jsonResponse({ error: "Invalid token" }, 401);
    }

    const userId = userData.user.id;
    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // ── 2. Parse request ─────────────────────────────────────
    const body = await req.json();
    const { plan_id, company_id, callback_url, country } = body;

    if (!plan_id || !company_id) {
      return jsonResponse(
        { error: "plan_id and company_id are required" },
        400
      );
    }

    // Determine gateway based on country
    const isEgypt =
      (country || "").toUpperCase() === "EG" ||
      (country || "").toLowerCase() === "egypt";

    // ── 3. Verify company access ─────────────────────────────
    const { data: company } = await admin
      .from("companies")
      .select("id, owner_id, name, name_en")
      .eq("id", company_id)
      .maybeSingle();

    if (!company) {
      return jsonResponse({ error: "Company not found" }, 404);
    }

    if (company.owner_id !== userId) {
      const { data: member } = await admin
        .from("company_members")
        .select("id")
        .eq("company_id", company_id)
        .eq("user_id", userId)
        .eq("is_active", true)
        .eq("role", "admin")
        .maybeSingle();

      if (!member) {
        return jsonResponse(
          { error: "Only company owner or admin can make payments" },
          403
        );
      }
    }

    // ── 4. Get plan ──────────────────────────────────────────
    const { data: plan } = await admin
      .from("subscription_plans")
      .select("id, name_ar, name_en, price, duration_months")
      .eq("id", plan_id)
      .eq("is_active", true)
      .maybeSingle();

    if (!plan) {
      return jsonResponse({ error: "Plan not found or inactive" }, 400);
    }

    // ── 5. Find existing subscription ────────────────────────
    const { data: subscription } = await admin
      .from("subscriptions")
      .select("id")
      .eq("company_id", company_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    // ── 6. Gateway-specific logic ────────────────────────────

    if (isEgypt) {
      // ═══════════════════════════════════════════════════════
      //  KASHIER  (Egypt)
      // ═══════════════════════════════════════════════════════
      const kashierApiKey = Deno.env.get("KASHIER_API_KEY");
      const kashierMerchantId = Deno.env.get("KASHIER_MERCHANT_ID");

      if (!kashierApiKey || !kashierMerchantId) {
        return jsonResponse(
          { error: "Kashier payment gateway not configured" },
          503
        );
      }

      const merchantOrderId = `ORDER_${Date.now()}_${userId.slice(0, 8)}`;
      const amount = plan.price.toString();
      const currency = "EGP";

      // Generate HMAC SHA256 hash (Kashier official method)
      // Path format: /?payment=merchantId.orderId.amount.currency
      const path = `/?payment=${kashierMerchantId}.${merchantOrderId}.${amount}.${currency}`;
      const hash = await hmacSha256HexAsync(kashierApiKey, path);

      const appUrl = Deno.env.get("APP_URL") || "";
      const webhookUrl = `${supabaseUrl}/functions/v1/payment-webhook`;

      // Create pending payment record
      const { data: payment, error: paymentError } = await admin
        .from("payments")
        .insert({
          company_id,
          subscription_id: subscription?.id || null,
          plan_id: plan.id,
          amount: plan.price,
          currency: "EGP",
          gateway: "kashier",
          status: "pending",
          description: `Subscription: ${plan.name_en || plan.name_ar}`,
          created_by: userId,
          callback_url: callback_url || null,
          metadata: { merchant_order_id: merchantOrderId },
        })
        .select("id")
        .single();

      if (paymentError) {
        console.error("Payment record error:", paymentError);
        return jsonResponse(
          { error: "Failed to create payment record" },
          500
        );
      }

      // Update with gateway_payment_id
      await admin
        .from("payments")
        .update({ gateway_payment_id: merchantOrderId })
        .eq("id", payment.id);

      // Build Kashier checkout redirect URL (no iframe)
      const kashierCheckoutUrl = new URL("https://checkout.kashier.io");
      kashierCheckoutUrl.searchParams.set("merchantId", kashierMerchantId);
      kashierCheckoutUrl.searchParams.set("orderId", merchantOrderId);
      kashierCheckoutUrl.searchParams.set("amount", amount);
      kashierCheckoutUrl.searchParams.set("currency", currency);
      kashierCheckoutUrl.searchParams.set("hash", hash);
      kashierCheckoutUrl.searchParams.set("mode", Deno.env.get("KASHIER_MODE") || "live");
      kashierCheckoutUrl.searchParams.set("merchantRedirect", callback_url || `${appUrl}/client/payment?callback=true`);
      kashierCheckoutUrl.searchParams.set("serverWebhook", webhookUrl);
      kashierCheckoutUrl.searchParams.set("metaData", JSON.stringify({
        payment_id: payment.id,
        company_id,
        plan_id: plan.id,
        subscription_id: subscription?.id || null,
        plan_name: plan.name_en || plan.name_ar,
      }));
      kashierCheckoutUrl.searchParams.set("display", "en");

      // Return redirect URL (same pattern as PayTabs)
      return jsonResponse({
        gateway: "kashier",
        payment_id: payment.id,
        payment_url: kashierCheckoutUrl.toString(),
      });
    } else {
      // ═══════════════════════════════════════════════════════
      //  PAYTABS  (All other countries)
      // ═══════════════════════════════════════════════════════
      const paytabsProfileId = Deno.env.get("PAYTABS_PROFILE_ID");
      const paytabsServerKey = Deno.env.get("PAYTABS_SERVER_KEY");
      const paytabsBaseUrl =
        Deno.env.get("PAYTABS_BASE_URL") ||
        "https://secure-egypt.paytabs.com";

      if (!paytabsProfileId || !paytabsServerKey) {
        return jsonResponse(
          { error: "PayTabs payment gateway not configured" },
          503
        );
      }

      const cartId = `SUB_${Date.now()}_${userId.slice(0, 8)}`;
      const appUrl = Deno.env.get("APP_URL") || "";
      const webhookUrl = `${supabaseUrl}/functions/v1/payment-webhook`;

      // Create pending payment record
      const { data: payment, error: paymentError } = await admin
        .from("payments")
        .insert({
          company_id,
          subscription_id: subscription?.id || null,
          plan_id: plan.id,
          amount: plan.price,
          currency: "SAR",
          gateway: "paytabs",
          status: "pending",
          description: `Subscription: ${plan.name_en || plan.name_ar}`,
          created_by: userId,
          callback_url: callback_url || null,
          metadata: { cart_id: cartId },
        })
        .select("id")
        .single();

      if (paymentError) {
        console.error("Payment record error:", paymentError);
        return jsonResponse(
          { error: "Failed to create payment record" },
          500
        );
      }

      // Call PayTabs Hosted Payment Page API
      const paytabsPayload = {
        profile_id: parseInt(paytabsProfileId),
        tran_type: "sale",
        tran_class: "ecom",
        cart_id: cartId,
        cart_description: `YonisAcc - ${plan.name_en || plan.name_ar} - ${company.name_en || company.name}`,
        cart_currency: "SAR",
        cart_amount: plan.price,
        callback: webhookUrl,
        return: callback_url || `${appUrl}/client/payment?callback=true`,
        user_defined: {
          udf1: payment.id, // our internal payment ID
          udf2: company_id,
          udf3: plan.id,
          udf4: subscription?.id || "",
        },
      };

      const paytabsResponse = await fetch(
        `${paytabsBaseUrl}/payment/request`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: paytabsServerKey,
          },
          body: JSON.stringify(paytabsPayload),
        }
      );

      const paytabsData = await paytabsResponse.json();

      if (!paytabsResponse.ok || !paytabsData.redirect_url) {
        console.error("PayTabs error:", paytabsData);
        await admin
          .from("payments")
          .update({
            status: "failed",
            gateway_status: paytabsData.code || "error",
            metadata: { error: paytabsData },
          })
          .eq("id", payment.id);

        return jsonResponse(
          {
            error: "Payment gateway error",
            details: paytabsData.message || "Unable to create payment page",
          },
          502
        );
      }

      // Update payment with gateway ref
      await admin
        .from("payments")
        .update({
          gateway_payment_id: paytabsData.tran_ref || cartId,
          gateway_status: "created",
        })
        .eq("id", payment.id);

      return jsonResponse({
        gateway: "paytabs",
        payment_id: payment.id,
        gateway_payment_id: paytabsData.tran_ref || null,
        payment_url: paytabsData.redirect_url,
      });
    }
  } catch (err) {
    console.error("payment-create-session error:", err);
    return jsonResponse({ error: "Internal server error" }, 500);
  }
});
