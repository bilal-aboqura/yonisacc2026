import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

/** Normalize Saudi/Gulf phone numbers to E.164 format (+966XXXXXXXXX) */
function normalizePhone(raw: string): string | null {
  // Remove spaces, dashes, parentheses
  let p = raw.replace(/[\s\-().]/g, '');

  // Already E.164 with +
  if (/^\+\d{10,15}$/.test(p)) return p;

  // +966XXXXXXXXX → keep as-is
  if (p.startsWith('+966') && p.length === 13) return p;

  // 00966XXXXXXXXX → +966XXXXXXXXX
  if (p.startsWith('00966')) return '+' + p.slice(2);

  // 05XXXXXXXX (Saudi local) → +9665XXXXXXXX
  if (/^05\d{8}$/.test(p)) return '+966' + p.slice(1);

  // 5XXXXXXXX (9 digits) → +9665XXXXXXXX
  if (/^5\d{8}$/.test(p)) return '+966' + p;

  // Return null if we can't normalize — let basic validation handle it
  return p.length >= 9 ? p : null;
}

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

    const name = (body.name || body.company_name || '').trim();
    const name_en = (body.name_en || body.company_name_en || '').trim() || null;
    const email = (body.email || '').trim();
    const phone = (body.phone || '').trim();
    const commercial_register = (body.commercial_register || '').trim() || null;
    const tax_number = (body.tax_number || '').trim() || null;
    const address = (body.address || '').trim() || null;
    const activity_type = (body.activity_type || body.industry || '').trim() || null;
    const country = (body.country || 'SA').trim();
    const timezone = (body.timezone || 'Asia/Riyadh').trim();
    const language = (body.language || 'ar').trim();
    const base_currency = (body.base_currency || 'SAR').trim();
    const modules: string[] = Array.isArray(body.modules) ? body.modules : [];
    const full_name = (body.full_name || '').trim() || null;
    const plan_id: string | null = body.plan_id || null;

    // Validation
    if (!name || name.length < 2) {
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
    if (!phone || phone.length < 9) {
      return new Response(JSON.stringify({ error: 'رقم الهاتف غير صالح' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Normalize phone to E.164
    const normalizedPhone = normalizePhone(phone);
    if (!normalizedPhone) {
      return new Response(JSON.stringify({ error: 'رقم الهاتف غير صالح' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── 3. Service-role client (bypasses RLS) ────────────────────────────────
    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // ── 4. Check phone uniqueness BEFORE creating tenant ──────────────────────
    const { data: existingPhone, error: phoneCheckError } = await admin
      .from('profiles')
      .select('id')
      .eq('phone_number', normalizedPhone)
      .maybeSingle();

    if (phoneCheckError) {
      console.error('Phone uniqueness check error:', phoneCheckError);
    }

    if (existingPhone) {
      return new Response(
        JSON.stringify({
          error: 'رقم الجوال مستخدم بالفعل',
          error_en: 'This phone number is already registered',
          code: 'PHONE_ALREADY_EXISTS',
        }),
        {
          status: 409,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // ── 5. Prevent duplicate company for the same owner ───────────────────────
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

    // ── 6. Resolve plan_id ────────────────────────────────────────────────────
    let resolvedPlanId = plan_id;
    if (!resolvedPlanId) {
      const { data: defaultPlan } = await admin
        .from('subscription_plans')
        .select('id')
        .eq('is_active', true)
        .order('sort_order', { ascending: true })
        .limit(1)
        .maybeSingle();
      resolvedPlanId = defaultPlan?.id || null;
    } else {
      const { data: plan } = await admin
        .from('subscription_plans')
        .select('id')
        .eq('id', resolvedPlanId)
        .eq('is_active', true)
        .maybeSingle();
      if (!plan) {
        return new Response(JSON.stringify({ error: 'الباقة المختارة غير متاحة' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    if (!resolvedPlanId) {
      return new Response(JSON.stringify({ error: 'لا توجد باقات متاحة في النظام' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── 7. Provision everything via atomic DB RPC ─────────────────────────────
    const { data: rpcData, error: rpcError } = await admin.rpc('provision_tenant', {
      p_user_id: userId,
      p_name: name,
      p_name_en: name_en,
      p_email: email,
      p_phone: phone,
      p_commercial_register: commercial_register,
      p_tax_number: tax_number,
      p_activity_type: activity_type,
      p_address: address,
      p_plan_id: resolvedPlanId,
    });

    if (rpcError) {
      console.error('provision_tenant RPC error:', rpcError);
      return new Response(JSON.stringify({ error: 'حدث خطأ في إنشاء الشركة. يرجى المحاولة مرة أخرى.' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const companyId = rpcData as string;

    // ── 8. Update profile: full_name, language, phone_number ─────────────────
    const profileUpdate: Record<string, unknown> = { language };
    if (full_name) profileUpdate.full_name = full_name;
    profileUpdate.phone_number = normalizedPhone;

    await admin
      .from('profiles')
      .update(profileUpdate)
      .eq('user_id', userId);

    // ── 9. Store selected modules as enabled client_screens ───────────────────
    if (modules.length > 0) {
      const { data: screens } = await admin
        .from('system_screens')
        .select('id, module');

      if (screens && screens.length > 0) {
        const matchedScreenIds = screens
          .filter((s) => modules.some((m) => s.module?.toLowerCase().includes(m.toLowerCase()) || m.toLowerCase().includes(s.module?.toLowerCase() ?? '')))
          .map((s) => s.id);

        if (matchedScreenIds.length > 0) {
          const insertRows = matchedScreenIds.map((screen_id) => ({
            company_id: companyId,
            screen_id,
            is_enabled: true,
          }));
          await admin.from('client_screens').insert(insertRows).throwOnError();
        }
      }
    }

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
