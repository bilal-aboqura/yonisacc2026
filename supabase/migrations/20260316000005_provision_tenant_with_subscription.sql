-- ============================================================
-- MIGRATION Part 2: Auto-subscription + provision_tenant fix
-- (Run AFTER 20260316000004 which adds 'trialing' to enum)
-- ============================================================

-- 1. Create subscription for all companies that don't have one
INSERT INTO public.subscriptions (company_id, plan_id, status, start_date, end_date)
SELECT 
  c.id,
  (SELECT id FROM public.subscription_plans WHERE is_active = true ORDER BY sort_order ASC LIMIT 1),
  'trialing'::subscription_status,
  CURRENT_DATE,
  CURRENT_DATE + INTERVAL '1 year'
FROM public.companies c
WHERE c.deleted_at IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.subscriptions s WHERE s.company_id = c.id
  );

-- 2. Fix provision_tenant function to auto-create subscription with 'trialing' status
CREATE OR REPLACE FUNCTION public.provision_tenant(
  p_user_id UUID,
  p_name TEXT,
  p_name_en TEXT DEFAULT NULL,
  p_email TEXT DEFAULT NULL,
  p_phone TEXT DEFAULT NULL,
  p_commercial_register TEXT DEFAULT NULL,
  p_tax_number TEXT DEFAULT NULL,
  p_activity_type TEXT DEFAULT NULL,
  p_address TEXT DEFAULT NULL,
  p_plan_id UUID DEFAULT NULL,
  p_country TEXT DEFAULT 'SA',
  p_timezone TEXT DEFAULT 'Asia/Riyadh',
  p_language TEXT DEFAULT 'ar',
  p_base_currency TEXT DEFAULT 'SAR'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_id UUID;
  v_plan_id UUID;
  v_duration_months INTEGER;
BEGIN
  -- ── 1. Create company ──────────────────────────────────
  INSERT INTO public.companies (
    owner_id, name, name_en, email, phone,
    commercial_register, tax_number, activity_type, address,
    currency, deleted_at
  ) VALUES (
    p_user_id,
    p_name,
    p_name_en,
    p_email,
    p_phone,
    p_commercial_register,
    p_tax_number,
    p_activity_type,
    p_address,
    COALESCE(p_base_currency, 'SAR'),
    NULL
  )
  RETURNING id INTO v_company_id;

  -- ── 2. Resolve subscription plan ───────────────────────
  IF p_plan_id IS NOT NULL THEN
    SELECT id INTO v_plan_id 
    FROM public.subscription_plans 
    WHERE id = p_plan_id AND is_active = true;
  END IF;

  -- Fallback to first active plan (free/cheapest)
  IF v_plan_id IS NULL THEN
    SELECT id INTO v_plan_id 
    FROM public.subscription_plans 
    WHERE is_active = true 
    ORDER BY sort_order ASC, price ASC
    LIMIT 1;
  END IF;

  -- ── 3. Get plan duration ────────────────────────────────
  SELECT COALESCE(duration_months, 12) INTO v_duration_months
  FROM public.subscription_plans
  WHERE id = v_plan_id;

  -- ── 4. Create subscription with trialing status ─────────
  IF v_plan_id IS NOT NULL THEN
    INSERT INTO public.subscriptions (
      company_id, plan_id, status, start_date, end_date
    ) VALUES (
      v_company_id,
      v_plan_id,
      'trialing'::subscription_status,
      CURRENT_DATE,
      CURRENT_DATE + (v_duration_months || ' months')::INTERVAL
    );
  END IF;

  -- ── 5. Create a default branch ──────────────────────────
  INSERT INTO public.branches (company_id, name, name_en, is_main, is_active)
  VALUES (v_company_id, p_name, p_name_en, true, true);

  -- ── 6. Create default chart of accounts ────────────────
  PERFORM public.create_default_chart_of_accounts(v_company_id);

  -- ── 7. Insert user role as 'client' ─────────────────────
  INSERT INTO public.user_roles (user_id, role)
  VALUES (p_user_id, 'client'::app_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN v_company_id;
END;
$$;

-- 3. Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.provision_tenant(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, UUID, TEXT, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.provision_tenant(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, UUID, TEXT, TEXT, TEXT, TEXT) TO service_role;

-- 4. Verify current subscriptions
SELECT 
  c.name as company_name,
  s.status,
  s.start_date,
  s.end_date,
  sp.name_en as plan_name
FROM public.subscriptions s
JOIN public.companies c ON c.id = s.company_id
JOIN public.subscription_plans sp ON sp.id = s.plan_id
ORDER BY s.created_at DESC;
