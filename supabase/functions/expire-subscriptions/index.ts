import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGIN') || '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

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
    const todayStr = today.toISOString().split('T')[0];

    // Grace period: 7 days after end_date
    const graceDays = 7;

    // Step 1: Move active/trialing subscriptions past end_date to 'past_due'
    // and set grace_period_end = end_date + 7 days
    const { data: pastDueSubs, error: pdError } = await admin
      .from('subscriptions')
      .select('id, end_date, company_id')
      .in('status', ['active', 'trialing'])
      .lt('end_date', todayStr);

    if (pdError) {
      console.error('Error finding past-due subscriptions:', pdError);
    } else if (pastDueSubs && pastDueSubs.length > 0) {
      for (const sub of pastDueSubs) {
        const graceEnd = new Date(sub.end_date);
        graceEnd.setDate(graceEnd.getDate() + graceDays);

        await admin
          .from('subscriptions')
          .update({
            status: 'past_due',
            grace_period_end: graceEnd.toISOString().split('T')[0],
          } as any)
          .eq('id', sub.id);
      }
      console.log(`Moved ${pastDueSubs.length} subscriptions to past_due with ${graceDays}-day grace period`);
    }

    // Step 2: Expire past_due subscriptions that have exceeded their grace period
    const { data: expiredSubs, error: expError } = await admin
      .from('subscriptions')
      .update({ status: 'expired' })
      .eq('status', 'past_due')
      .lt('grace_period_end', todayStr)
      .select('id, company_id');

    if (expError) {
      console.error('Error expiring subscriptions:', expError);
    }

    console.log(`Expired ${expiredSubs?.length || 0} subscriptions past grace period`);

    return new Response(JSON.stringify({
      success: true,
      past_due_count: pastDueSubs?.length || 0,
      expired_count: expiredSubs?.length || 0,
      timestamp: today.toISOString(),
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('expire-subscriptions error:', err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
