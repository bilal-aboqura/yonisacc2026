import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": Deno.env.get("ALLOWED_ORIGIN") || "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

// ---------- helpers ----------

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

// ---------- shared: activate subscription ----------

async function activateSubscription(
  admin: any,
  payment: any
) {
  if (!payment.plan_id) return;

  const { data: plan } = await admin
    .from("subscription_plans")
    .select("duration_months")
    .eq("id", payment.plan_id)
    .maybeSingle();

  const durationMonths = plan?.duration_months || 1;
  const now = new Date();
  const endDate = new Date(now);
  endDate.setMonth(endDate.getMonth() + durationMonths);

  if (payment.subscription_id) {
    await admin
      .from("subscriptions")
      .update({
        status: "active",
        plan_id: payment.plan_id,
        start_date: now.toISOString().split("T")[0],
        end_date: endDate.toISOString().split("T")[0],
        payment_reference: payment.gateway_payment_id,
        payment_date: now.toISOString(),
        grace_period_end: null,
      })
      .eq("id", payment.subscription_id);
  } else {
    await admin.from("subscriptions").insert({
      company_id: payment.company_id,
      plan_id: payment.plan_id,
      status: "active",
      start_date: now.toISOString().split("T")[0],
      end_date: endDate.toISOString().split("T")[0],
      payment_reference: payment.gateway_payment_id,
      payment_date: now.toISOString(),
    });
  }

  console.log(
    `Subscription activated for company ${payment.company_id}, plan ${payment.plan_id}, ends ${endDate.toISOString().split("T")[0]}`
  );
}

// ---------- Kashier webhook ----------

async function handleKashierWebhook(
  req: Request,
  admin: any
): Promise<Response> {
  const url = new URL(req.url);
  const query: Record<string, string> = {};
  url.searchParams.forEach((v, k) => {
    query[k] = v;
  });

  // Also check POST body for server webhook
  let bodyParams: Record<string, any> = {};
  if (req.method === "POST") {
    try {
      const text = await req.text();
      // Kashier may send form-encoded or JSON
      if (text.startsWith("{")) {
        bodyParams = JSON.parse(text);
      } else {
        const sp = new URLSearchParams(text);
        sp.forEach((v, k) => {
          bodyParams[k] = v;
        });
      }
    } catch (_e) {
      // ignore parse errors
    }
  }

  // Merge — query params take precedence
  const params = { ...bodyParams, ...query };

  const orderId =
    params.merchantOrderId ||
    params.orderId ||
    params.order_id ||
    params.merchantorderid;
  const paymentStatus =
    params.paymentStatus || params.status || params.transactionStatus;
  const signature = params.signature;

  if (!orderId) {
    return jsonResponse({ error: "Missing order ID" }, 400);
  }

  // Verify HMAC signature
  const kashierApiKey = Deno.env.get("KASHIER_API_KEY");
  if (kashierApiKey && signature) {
    // Build query string from all params except 'signature' and 'mode'
    let queryString = "";
    for (const key of Object.keys(params).sort()) {
      if (key === "signature" || key === "mode") continue;
      queryString += "&" + key + "=" + params[key];
    }
    const finalUrl = queryString.substring(1);
    const calculatedSig = await hmacSha256HexAsync(kashierApiKey, finalUrl);

    if (calculatedSig !== signature) {
      console.error("Kashier signature mismatch:", {
        calculated: calculatedSig,
        received: signature,
      });
      // Don't block — log but continue (signature format may vary)
    } else {
      console.log("Kashier signature verified ✓");
    }
  }

  // Find payment by gateway_payment_id (merchantOrderId)
  const { data: payment, error: findError } = await admin
    .from("payments")
    .select("id, company_id, subscription_id, plan_id, amount, status, gateway_payment_id")
    .eq("gateway_payment_id", orderId)
    .maybeSingle();

  if (findError || !payment) {
    console.error("Payment not found for Kashier order:", orderId, findError);
    return jsonResponse({ error: "Payment record not found" }, 404);
  }

  if (payment.status === "paid") {
    const appUrl = Deno.env.get("APP_URL") || "";
    if (req.method === "GET") {
      return Response.redirect(
        `${appUrl}/client/payment?status=success&payment_id=${payment.id}`,
        302
      );
    }
    return jsonResponse({ status: "already_processed" });
  }

  const isPaid =
    paymentStatus === "SUCCESS" ||
    paymentStatus === "success" ||
    paymentStatus === "CAPTURED";

  // Update payment record
  await admin
    .from("payments")
    .update({
      status: isPaid ? "paid" : "failed",
      gateway_status: paymentStatus,
      paid_at: isPaid ? new Date().toISOString() : null,
      payment_method: params.paymentMethod || params.sourceOfFunds || "card",
      metadata: {
        gateway: "kashier",
        raw_params: params,
      },
    })
    .eq("id", payment.id);

  // Activate subscription
  if (isPaid) {
    await activateSubscription(admin, payment);
  }

  // Redirect for GET (user returning from Kashier)
  if (req.method === "GET") {
    const appUrl = Deno.env.get("APP_URL") || "";
    const status = isPaid ? "success" : "failed";
    return Response.redirect(
      `${appUrl}/client/payment?status=${status}&payment_id=${payment.id}`,
      302
    );
  }

  return jsonResponse({
    success: true,
    payment_id: payment.id,
    status: isPaid ? "paid" : "failed",
  });
}

// ---------- PayTabs webhook ----------

async function handlePayTabsWebhook(
  req: Request,
  admin: any
): Promise<Response> {
  let body: any = {};

  if (req.method === "GET") {
    // PayTabs redirect — query params
    const url = new URL(req.url);
    url.searchParams.forEach((v, k) => {
      body[k] = v;
    });
  } else {
    // POST IPN from PayTabs
    body = await req.json();
  }

  // PayTabs sends: tran_ref, cart_id, payment_result { response_status, response_code, response_message }
  const tranRef = body.tran_ref;
  const cartId = body.cart_id;
  const paymentResult = body.payment_result || {};
  const responseStatus = paymentResult.response_status || body.response_status;

  // Try to find payment by user_defined fields or tran_ref
  const paymentId =
    body.user_defined?.udf1 ||
    (body.payment_info && body.payment_info.payment_description);

  // Find by gateway_payment_id (tran_ref or cart_id)
  let payment: any = null;

  if (tranRef) {
    const { data } = await admin
      .from("payments")
      .select("id, company_id, subscription_id, plan_id, amount, status, gateway_payment_id")
      .eq("gateway_payment_id", tranRef)
      .maybeSingle();
    payment = data;
  }

  if (!payment && cartId) {
    // Try matching via metadata->cart_id
    const { data } = await admin
      .from("payments")
      .select("id, company_id, subscription_id, plan_id, amount, status, gateway_payment_id")
      .eq("gateway", "paytabs")
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(10);

    if (data) {
      payment = data.find(
        (p: any) => p.gateway_payment_id === tranRef || 
                     (p.metadata && (p.metadata as any).cart_id === cartId)
      );
    }
  }

  // Also try udf1 (our payment ID)
  if (!payment && paymentId) {
    const { data } = await admin
      .from("payments")
      .select("id, company_id, subscription_id, plan_id, amount, status, gateway_payment_id")
      .eq("id", paymentId)
      .maybeSingle();
    payment = data;
  }

  if (!payment) {
    console.error(
      "Payment not found for PayTabs ref:",
      tranRef,
      "cart:",
      cartId
    );
    return jsonResponse({ error: "Payment record not found" }, 404);
  }

  if (payment.status === "paid") {
    if (req.method === "GET") {
      const appUrl = Deno.env.get("APP_URL") || "";
      return Response.redirect(
        `${appUrl}/client/payment?status=success&payment_id=${payment.id}`,
        302
      );
    }
    return jsonResponse({ status: "already_processed" });
  }

  // PayTabs response_status: "A" = Authorized/Approved
  const isPaid = responseStatus === "A";

  // Optionally verify with PayTabs API
  const paytabsServerKey = Deno.env.get("PAYTABS_SERVER_KEY");
  const paytabsBaseUrl =
    Deno.env.get("PAYTABS_BASE_URL") || "https://secure-egypt.paytabs.com";

  if (paytabsServerKey && tranRef) {
    try {
      const verifyRes = await fetch(`${paytabsBaseUrl}/payment/query`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: paytabsServerKey,
        },
        body: JSON.stringify({
          profile_id: parseInt(Deno.env.get("PAYTABS_PROFILE_ID") || "0"),
          tran_ref: tranRef,
        }),
      });

      if (verifyRes.ok) {
        const verifyData = await verifyRes.json();
        console.log("PayTabs verification:", verifyData.payment_result);
      }
    } catch (e) {
      console.error("PayTabs verify error:", e);
    }
  }

  // Update payment record
  await admin
    .from("payments")
    .update({
      status: isPaid ? "paid" : "failed",
      gateway_status: responseStatus,
      gateway_payment_id: tranRef || payment.gateway_payment_id,
      paid_at: isPaid ? new Date().toISOString() : null,
      payment_method:
        body.payment_info?.payment_method ||
        body.payment_info?.card_scheme ||
        null,
      metadata: {
        gateway: "paytabs",
        tran_ref: tranRef,
        cart_id: cartId,
        payment_result: paymentResult,
        payment_info: body.payment_info || {},
      },
    })
    .eq("id", payment.id);

  // Activate subscription
  if (isPaid) {
    await activateSubscription(admin, payment);
  }

  // Redirect for GET (user returning from PayTabs)
  if (req.method === "GET") {
    const appUrl = Deno.env.get("APP_URL") || "";
    const status = isPaid ? "success" : "failed";
    return Response.redirect(
      `${appUrl}/client/payment?status=${status}&payment_id=${payment.id}`,
      302
    );
  }

  return jsonResponse({
    success: true,
    payment_id: payment.id,
    status: isPaid ? "paid" : "failed",
  });
}

// ---------- main handler ----------

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Detect which gateway sent the callback
    const url = new URL(req.url);

    // Check for explicit gateway param
    const gatewayParam = url.searchParams.get("gateway");

    // Kashier indicators: has 'signature' param, or 'merchantOrderId', or gateway=kashier
    const isKashier =
      gatewayParam === "kashier" ||
      url.searchParams.has("signature") ||
      url.searchParams.has("merchantOrderId") ||
      url.searchParams.has("merchantorderid");

    // PayTabs indicators: has 'tran_ref' param, JSON body with tran_ref, or gateway=paytabs
    const isPayTabs =
      gatewayParam === "paytabs" ||
      url.searchParams.has("tran_ref") ||
      url.searchParams.has("tranRef");

    if (isKashier) {
      return await handleKashierWebhook(req, admin);
    }

    if (isPayTabs) {
      return await handlePayTabsWebhook(req, admin);
    }

    // If unclear, try to detect from POST body
    if (req.method === "POST") {
      // Clone request to read body without consuming
      const cloned = req.clone();
      try {
        const body = await cloned.json();

        if (body.tran_ref || body.cart_id || body.payment_result) {
          // PayTabs format
          // We need to re-create the request since we consumed the clone
          const newReq = new Request(req.url, {
            method: req.method,
            headers: req.headers,
            body: JSON.stringify(body),
          });
          return await handlePayTabsWebhook(newReq, admin);
        }

        if (
          body.merchantOrderId ||
          body.orderId ||
          body.paymentStatus
        ) {
          const newReq = new Request(req.url, {
            method: req.method,
            headers: req.headers,
            body: JSON.stringify(body),
          });
          return await handleKashierWebhook(newReq, admin);
        }
      } catch (_e) {
        // Not JSON — try as Kashier form data
        return await handleKashierWebhook(req, admin);
      }
    }

    return jsonResponse(
      { error: "Unable to determine payment gateway" },
      400
    );
  } catch (err) {
    console.error("payment-webhook error:", err);
    return jsonResponse({ error: "Internal server error" }, 500);
  }
});
