import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGIN') || '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        // 1. Authenticate the calling user
        const authHeader = req.headers.get('Authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), {
                status: 401,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
        const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const moyasarSecretKey = Deno.env.get('MOYASAR_SECRET_KEY');

        if (!moyasarSecretKey) {
            return new Response(JSON.stringify({ error: 'Payment gateway not configured' }), {
                status: 503,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        // Verify user
        const anonClient = createClient(supabaseUrl, anonKey, {
            global: { headers: { Authorization: authHeader } },
        });
        const token = authHeader.replace('Bearer ', '');
        const { data: userData, error: userError } = await anonClient.auth.getUser(token);
        if (userError || !userData?.user) {
            return new Response(JSON.stringify({ error: 'Invalid token' }), {
                status: 401,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        const userId = userData.user.id;
        const admin = createClient(supabaseUrl, serviceKey, {
            auth: { autoRefreshToken: false, persistSession: false },
        });

        // 2. Parse request
        const body = await req.json();
        const { plan_id, company_id, callback_url } = body;

        if (!plan_id || !company_id) {
            return new Response(JSON.stringify({ error: 'plan_id and company_id are required' }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        // 3. Verify user belongs to company
        const { data: company } = await admin
            .from('companies')
            .select('id, owner_id, name')
            .eq('id', company_id)
            .maybeSingle();

        if (!company) {
            return new Response(JSON.stringify({ error: 'Company not found' }), {
                status: 404,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        // Only company owner can initiate payments
        if (company.owner_id !== userId) {
            const { data: member } = await admin
                .from('company_members')
                .select('id')
                .eq('company_id', company_id)
                .eq('user_id', userId)
                .eq('is_active', true)
                .eq('role', 'admin')
                .maybeSingle();

            if (!member) {
                return new Response(JSON.stringify({ error: 'Only company owner or admin can make payments' }), {
                    status: 403,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                });
            }
        }

        // 4. Get plan details
        const { data: plan } = await admin
            .from('subscription_plans')
            .select('id, name_ar, name_en, price, duration_months')
            .eq('id', plan_id)
            .eq('is_active', true)
            .maybeSingle();

        if (!plan) {
            return new Response(JSON.stringify({ error: 'Plan not found or inactive' }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        // 5. Get or find subscription
        const { data: subscription } = await admin
            .from('subscriptions')
            .select('id')
            .eq('company_id', company_id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        // 6. Create a pending payment record
        const amountInHalala = Math.round(plan.price * 100); // Moyasar expects amount in halala (cents)
        const { data: payment, error: paymentError } = await admin
            .from('payments')
            .insert({
                company_id,
                subscription_id: subscription?.id || null,
                plan_id: plan.id,
                amount: plan.price,
                currency: 'SAR',
                gateway: 'moyasar',
                status: 'pending',
                description: `Subscription: ${plan.name_en || plan.name_ar}`,
                created_by: userId,
                callback_url: callback_url || null,
            })
            .select('id')
            .single();

        if (paymentError) {
            console.error('Payment record error:', paymentError);
            return new Response(JSON.stringify({ error: 'Failed to create payment record' }), {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        // 7. Create Moyasar payment session
        const moyasarPayload = {
            amount: amountInHalala,
            currency: 'SAR',
            description: `YonisAcc - ${plan.name_en || plan.name_ar} - ${company.name}`,
            callback_url: callback_url || `${supabaseUrl}/functions/v1/payment-webhook`,
            metadata: {
                payment_id: payment.id,
                company_id,
                plan_id: plan.id,
                subscription_id: subscription?.id || null,
            },
            source: {
                type: 'creditcard', // Can also be 'mada', 'applepay', 'stcpay'
            },
        };

        const moyasarResponse = await fetch('https://api.moyasar.com/v1/payments', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Basic ${btoa(moyasarSecretKey + ':')}`,
            },
            body: JSON.stringify(moyasarPayload),
        });

        const moyasarData = await moyasarResponse.json();

        if (!moyasarResponse.ok) {
            console.error('Moyasar error:', moyasarData);
            // Update payment record to failed
            await admin.from('payments').update({
                status: 'failed',
                gateway_status: moyasarData.type || 'error',
                metadata: { error: moyasarData },
            }).eq('id', payment.id);

            return new Response(JSON.stringify({
                error: 'Payment gateway error',
                details: moyasarData.message || 'Unable to create payment',
            }), {
                status: 502,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        // 8. Update payment with gateway ID
        await admin.from('payments').update({
            gateway_payment_id: moyasarData.id,
            gateway_status: moyasarData.status,
        }).eq('id', payment.id);

        // 9. Return payment URL to frontend
        return new Response(JSON.stringify({
            payment_id: payment.id,
            gateway_payment_id: moyasarData.id,
            payment_url: moyasarData.source?.transaction_url || null,
            status: moyasarData.status,
        }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

    } catch (err) {
        console.error('payment-create-session error:', err);
        return new Response(JSON.stringify({ error: 'Internal server error' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
});
