import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

function normalizePhone(raw: string): string | null {
  let p = raw.replace(/[\s\-().]/g, '');
  if (/^\+\d{10,15}$/.test(p)) return p;
  if (p.startsWith('+966') && p.length === 13) return p;
  if (p.startsWith('00966')) return '+' + p.slice(2);
  if (/^05\d{8}$/.test(p)) return '+966' + p.slice(1);
  if (/^5\d{8}$/.test(p)) return '+966' + p;
  return p.length >= 9 ? p : null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // 1. Authenticate caller as platform owner
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const anonClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: callerData, error: callerError } = await anonClient.auth.getUser(token);
    if (callerError || !callerData?.user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify caller is owner
    const { data: ownerRole } = await admin
      .from('user_roles')
      .select('id')
      .eq('user_id', callerData.user.id)
      .eq('role', 'owner')
      .maybeSingle();

    if (!ownerRole) {
      return new Response(JSON.stringify({ error: 'Forbidden: owner role required' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 2. Parse body
    const body = await req.json();
    const email = (body.email || '').trim().toLowerCase();
    const password = (body.password || '').trim();
    const companyName = (body.company_name || '').trim();
    const companyNameEn = (body.company_name_en || '').trim() || null;
    const phone = (body.phone || '').trim();
    const fullName = (body.full_name || '').trim() || null;
    const planId = (body.plan_id || '').trim();
    const activityType = (body.activity_type || '').trim() || null;
    const taxNumber = (body.tax_number || '').trim() || null;
    const commercialRegister = (body.commercial_register || '').trim() || null;
    const address = (body.address || '').trim() || null;

    // 3. Validate
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return new Response(JSON.stringify({ error: 'البريد الإلكتروني غير صالح', error_en: 'Invalid email' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (!password || password.length < 8) {
      return new Response(JSON.stringify({ error: 'كلمة المرور يجب أن تكون 8 أحرف على الأقل', error_en: 'Password must be at least 8 characters' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (!companyName || companyName.length < 2) {
      return new Response(JSON.stringify({ error: 'اسم الشركة مطلوب', error_en: 'Company name required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (!planId) {
      return new Response(JSON.stringify({ error: 'يجب اختيار باقة', error_en: 'Plan selection required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Normalize phone
    let normalizedPhone: string | null = null;
    if (phone) {
      normalizedPhone = normalizePhone(phone);
      if (!normalizedPhone) {
        return new Response(JSON.stringify({ error: 'رقم الهاتف غير صالح', error_en: 'Invalid phone number' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Check phone uniqueness
      const { data: existingPhone } = await admin
        .from('profiles')
        .select('id')
        .eq('phone_number', normalizedPhone)
        .maybeSingle();

      if (existingPhone) {
        return new Response(JSON.stringify({ error: 'رقم الجوال مستخدم بالفعل', error_en: 'Phone already registered', code: 'PHONE_ALREADY_EXISTS' }), {
          status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Verify plan exists
    const { data: plan } = await admin
      .from('subscription_plans')
      .select('id')
      .eq('id', planId)
      .eq('is_active', true)
      .maybeSingle();

    if (!plan) {
      return new Response(JSON.stringify({ error: 'الباقة غير متاحة', error_en: 'Plan not available' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 4. Create auth user (auto-confirmed)
    const { data: newUser, error: createError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName || companyName },
    });

    if (createError) {
      if (createError.message?.includes('already been registered') || createError.message?.includes('already exists')) {
        return new Response(JSON.stringify({ error: 'البريد الإلكتروني مسجل بالفعل', error_en: 'Email already registered', code: 'EMAIL_EXISTS' }), {
          status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      console.error('Create user error:', createError);
      return new Response(JSON.stringify({ error: 'فشل في إنشاء الحساب', error_en: createError.message }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const newUserId = newUser.user.id;

    // 5. Provision tenant (company, subscription, accounts, etc.)
    const { data: companyId, error: rpcError } = await admin.rpc('provision_tenant', {
      p_user_id: newUserId,
      p_name: companyName,
      p_name_en: companyNameEn,
      p_email: email,
      p_phone: phone || null,
      p_commercial_register: commercialRegister,
      p_tax_number: taxNumber,
      p_activity_type: activityType,
      p_address: address,
      p_plan_id: planId,
    });

    if (rpcError) {
      console.error('provision_tenant error:', rpcError);
      // Cleanup: delete the created user
      await admin.auth.admin.deleteUser(newUserId);
      return new Response(JSON.stringify({ error: 'فشل في إنشاء الشركة', error_en: 'Failed to provision company' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 6. Update profile
    const profileUpdate: Record<string, unknown> = { language: 'ar' };
    if (fullName) profileUpdate.full_name = fullName;
    if (normalizedPhone) profileUpdate.phone_number = normalizedPhone;

    await admin.from('profiles').update(profileUpdate).eq('user_id', newUserId);

    return new Response(JSON.stringify({ 
      success: true,
      company_id: companyId, 
      user_id: newUserId,
      email 
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('create-subscriber error:', err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
