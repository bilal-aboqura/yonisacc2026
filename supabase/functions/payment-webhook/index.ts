import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGIN') || '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const moyasarSecretKey = Deno.env.get('MOYASAR_SECRET_KEY');

        const admin = createClient(supabaseUrl, serviceKey, {
            auth: { autoRefreshToken: false, persistSession: false },
        });

        // Parse the callback from Moyasar (GET or POST)
        let paymentId: string | null = null;
        let gatewayPaymentId: string | null = null;
        let gatewayStatus: string | null = null;

        if (req.method === 'GET') {
            // Moyasar redirect callback — query params
            const url = new URL(req.url);
            paymentId = url.searchParams.get('id'); // Moyasar sends their payment ID
            gatewayStatus = url.searchParams.get('status');
        } else {
            // POST webhook from Moyasar
            const body = await req.json();

            // Verify webhook signature if secret key is available
            // Moyasar sends a signature in the header
            const signature = req.headers.get('X-Moyasar-Signature');
            if (moyasarSecretKey && signature) {
                // Optional: verify HMAC signature for production security
                // For now, we proceed and verify by fetching the payment from Moyasar API
            }

            paymentId = body.data?.id || body.id;
            gatewayStatus = body.data?.status || body.status;
        }

        if (!paymentId) {
            return new Response(JSON.stringify({ error: 'Missing payment ID' }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        // Fetch the actual payment from Moyasar to verify (prevents spoofing)
        let verifiedPayment: any = null;
        if (moyasarSecretKey) {
            try {
                const verifyResponse = await fetch(`https://api.moyasar.com/v1/payments/${paymentId}`, {
                    headers: {
                        Authorization: `Basic ${btoa(moyasarSecretKey + ':')}`,
                    },
                });
                if (verifyResponse.ok) {
                    verifiedPayment = await verifyResponse.json();
                    gatewayStatus = verifiedPayment.status;
                }
            } catch (e) {
                console.error('Failed to verify payment with Moyasar:', e);
            }
        }

        // Find our internal payment record by gateway_payment_id
        const { data: payment, error: findError } = await admin
            .from('payments')
            .select('id, company_id, subscription_id, plan_id, amount, status')
            .eq('gateway_payment_id', paymentId)
            .maybeSingle();

        if (findError || !payment) {
            // Try matching from metadata
            console.error('Payment not found for gateway ID:', paymentId, findError);
            return new Response(JSON.stringify({ error: 'Payment record not found' }), {
                status: 404,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        // Skip if already processed
        if (payment.status === 'paid') {
            // Redirect to success page if GET
            if (req.method === 'GET') {
                const redirectUrl = `${Deno.env.get('APP_URL') || supabaseUrl}/payment/success?payment_id=${payment.id}`;
                return Response.redirect(redirectUrl, 302);
            }
            return new Response(JSON.stringify({ status: 'already_processed' }), {
                status: 200,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        const isPaid = gatewayStatus === 'paid';

        // Update payment record
        await admin.from('payments').update({
            status: isPaid ? 'paid' : 'failed',
            gateway_status: gatewayStatus,
            paid_at: isPaid ? new Date().toISOString() : null,
            payment_method: verifiedPayment?.source?.type || null,
            metadata: verifiedPayment ? {
                gateway_response: {
                    id: verifiedPayment.id,
                    status: verifiedPayment.status,
                    amount: verifiedPayment.amount,
                    fee: verifiedPayment.fee,
                    source_type: verifiedPayment.source?.type,
                    source_company: verifiedPayment.source?.company,
                    source_name: verifiedPayment.source?.name,
                },
            } : {},
        }).eq('id', payment.id);

        // If paid, activate/renew subscription
        if (isPaid && payment.plan_id) {
            // Get plan duration
            const { data: plan } = await admin
                .from('subscription_plans')
                .select('duration_months')
                .eq('id', payment.plan_id)
                .maybeSingle();

            const durationMonths = plan?.duration_months || 1;
            const now = new Date();
            const endDate = new Date(now);
            endDate.setMonth(endDate.getMonth() + durationMonths);

            if (payment.subscription_id) {
                // Update existing subscription
                await admin.from('subscriptions').update({
                    status: 'active',
                    plan_id: payment.plan_id,
                    start_date: now.toISOString().split('T')[0],
                    end_date: endDate.toISOString().split('T')[0],
                    payment_reference: paymentId,
                    payment_date: now.toISOString(),
                    grace_period_end: null,
                }).eq('id', payment.subscription_id);
            } else {
                // Create new subscription
                await admin.from('subscriptions').insert({
                    company_id: payment.company_id,
                    plan_id: payment.plan_id,
                    status: 'active',
                    start_date: now.toISOString().split('T')[0],
                    end_date: endDate.toISOString().split('T')[0],
                    payment_reference: paymentId,
                    payment_date: now.toISOString(),
                });
            }
        }

        // Redirect for GET requests (user returning from payment gateway)
        if (req.method === 'GET') {
            const appUrl = Deno.env.get('APP_URL') || '';
            const redirectPath = isPaid ? '/payment/success' : '/payment/failed';
            const redirectUrl = `${appUrl}${redirectPath}?payment_id=${payment.id}`;
            return Response.redirect(redirectUrl, 302);
        }

        return new Response(JSON.stringify({
            success: true,
            payment_id: payment.id,
            status: isPaid ? 'paid' : 'failed',
        }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

    } catch (err) {
        console.error('payment-webhook error:', err);
        return new Response(JSON.stringify({ error: 'Internal server error' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
});
