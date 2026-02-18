import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // ── 1. Authenticate the calling user ─────────────────────────────────────
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify the JWT with an anon-keyed client scoped to the user
    const anonClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: userData, error: userError } = await anonClient.auth.getUser(token);
    if (userError || !userData?.user) {
      return new Response(JSON.stringify({ error: 'Invalid or expired token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userId = userData.user.id;

    // ── 2. Parse & validate the request body ─────────────────────────────────
    const body = await req.json();
    const { name, name_en, email, phone, commercial_register, tax_number, activity_type, address, plan_id } = body;

    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      return new Response(JSON.stringify({ error: 'اسم الشركة مطلوب (2 أحرف على الأقل)' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return new Response(JSON.stringify({ error: 'البريد الإلكتروني غير صالح' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (!phone || phone.trim().length < 9) {
      return new Response(JSON.stringify({ error: 'رقم الهاتف غير صالح' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (!plan_id || typeof plan_id !== 'string') {
      return new Response(JSON.stringify({ error: 'يرجى اختيار باقة' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── 3. Use service-role client for ALL writes (bypasses RLS) ─────────────
    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Prevent duplicate company for the same owner
    const { data: existingCompany } = await admin
      .from('companies')
      .select('id')
      .eq('owner_id', userId)
      .maybeSingle();

    if (existingCompany) {
      return new Response(JSON.stringify({ error: 'لديك شركة مسجلة بالفعل', company_id: existingCompany.id }), {
        status: 409,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate plan exists and is active
    const { data: plan, error: planError } = await admin
      .from('subscription_plans')
      .select('id, duration_months')
      .eq('id', plan_id)
      .eq('is_active', true)
      .single();

    if (planError || !plan) {
      return new Response(JSON.stringify({ error: 'الباقة المختارة غير متاحة' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── 4. Provision everything inside a DB transaction via RPC ──────────────
    // We call a server-side function that does all writes atomically.
    const { data: rpcData, error: rpcError } = await admin.rpc('provision_tenant', {
      p_user_id: userId,
      p_name: name.trim(),
      p_name_en: name_en?.trim() || null,
      p_email: email.trim(),
      p_phone: phone.trim(),
      p_commercial_register: commercial_register?.trim() || null,
      p_tax_number: tax_number?.trim() || null,
      p_activity_type: activity_type?.trim() || null,
      p_address: address?.trim() || null,
      p_plan_id: plan_id,
    });

    if (rpcError) {
      console.error('provision_tenant RPC error:', rpcError);
      return new Response(JSON.stringify({ error: 'حدث خطأ في إنشاء الشركة. يرجى المحاولة مرة أخرى.' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const companyId = rpcData as string;

    return new Response(JSON.stringify({ company_id: companyId }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('provision-tenant unhandled error:', err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
