import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGIN') || '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

/**
 * Subscription Renewal Reminder
 * 
 * Sends notification records for subscriptions expiring soon.
 * Designed to be triggered daily via cron or manual invocation.
 * 
 * Reminder schedule:
 *   - 7 days before expiry
 *   - 3 days before expiry
 *   - 1 day before expiry
 */
Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const admin = createClient(supabaseUrl, serviceKey, {
            auth: { autoRefreshToken: false, persistSession: false },
        });

        const today = new Date();
        const reminderDays = [7, 3, 1];
        const results: Array<{ days: number; count: number }> = [];

        for (const days of reminderDays) {
            const targetDate = new Date(today);
            targetDate.setDate(targetDate.getDate() + days);
            const targetDateStr = targetDate.toISOString().split('T')[0];

            // Find subscriptions expiring on exactly this date
            const { data: expiringSubs, error } = await admin
                .from('subscriptions')
                .select('id, company_id, end_date, plan_id, status')
                .in('status', ['active', 'trialing'])
                .eq('end_date', targetDateStr);

            if (error) {
                console.error(`Error finding subs expiring in ${days} days:`, error);
                continue;
            }

            if (expiringSubs && expiringSubs.length > 0) {
                for (const sub of expiringSubs) {
                    // Get company name for the notification
                    const { data: company } = await admin
                        .from('companies')
                        .select('name, name_en, owner_id')
                        .eq('id', sub.company_id)
                        .maybeSingle();

                    if (!company) continue;

                    // Create notification in audit_logs (reusing existing table since
                    // a dedicated notifications table doesn't exist yet)
                    await admin.from('audit_logs').insert({
                        user_id: company.owner_id,
                        action: 'subscription_renewal_reminder',
                        resource_type: 'subscription',
                        resource_id: sub.id,
                        details: {
                            company_name: company.name || company.name_en,
                            days_until_expiry: days,
                            end_date: sub.end_date,
                            status: sub.status,
                        },
                    } as any);
                }

                console.log(`Sent ${expiringSubs.length} reminders for ${days}-day expiry`);
                results.push({ days, count: expiringSubs.length });
            } else {
                results.push({ days, count: 0 });
            }
        }

        return new Response(JSON.stringify({
            success: true,
            reminders: results,
            timestamp: today.toISOString(),
        }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

    } catch (err) {
        console.error('subscription-renewal-reminder error:', err);
        return new Response(JSON.stringify({ error: 'Internal server error' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
});
