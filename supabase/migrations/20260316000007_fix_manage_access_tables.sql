-- =============================================
-- MIGRATION: Fix ManageCompanyAccess page
-- Creates missing tables, functions, and fixes RLS issues
-- =============================================

-- ─────────────────────────────────────────────────────
-- 1. FIX: company_members RLS - allow platform owner to manage all members
-- ─────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Platform owner can manage company members" ON public.company_members;

CREATE POLICY "Platform owner can manage company members" ON public.company_members
    FOR ALL
    USING (public.has_role(auth.uid(), 'owner'));

-- ─────────────────────────────────────────────────────
-- 2. CREATE: company_feature_overrides table
-- Stores custom feature limits per company (overriding plan defaults)
-- ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.company_feature_overrides (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL UNIQUE REFERENCES public.companies(id) ON DELETE CASCADE,
    custom_override BOOLEAN NOT NULL DEFAULT false,
    max_journal_entries INTEGER DEFAULT NULL,
    max_sales_invoices INTEGER DEFAULT NULL,
    max_purchase_invoices INTEGER DEFAULT NULL,
    max_users INTEGER DEFAULT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.company_feature_overrides ENABLE ROW LEVEL SECURITY;

-- Platform owner can manage all overrides
CREATE POLICY "Platform owner can manage overrides" ON public.company_feature_overrides
    FOR ALL
    USING (public.has_role(auth.uid(), 'owner'));

-- Company owner can view their own overrides
CREATE POLICY "Company owner can view overrides" ON public.company_feature_overrides
    FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM public.companies
        WHERE id = company_id AND owner_id = auth.uid()
    ));

-- ─────────────────────────────────────────────────────
-- 3. CREATE: rbac_permissions table
-- Stores all system permissions (module + code based)
-- ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.rbac_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE,
    module TEXT NOT NULL,
    description TEXT NOT NULL,
    description_ar TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.rbac_permissions ENABLE ROW LEVEL SECURITY;

-- Platform owner can manage permissions
CREATE POLICY "Platform owner can manage permissions" ON public.rbac_permissions
    FOR ALL
    USING (public.has_role(auth.uid(), 'owner'));

-- All authenticated users can view permissions
CREATE POLICY "Authenticated users can view permissions" ON public.rbac_permissions
    FOR SELECT
    USING (auth.uid() IS NOT NULL);

-- Seed default permissions
INSERT INTO public.rbac_permissions (code, module, description, description_ar) VALUES
  -- Accounting
  ('accounting.view',        'accounting', 'View accounting module',           'عرض وحدة المحاسبة'),
  ('accounting.journals',    'accounting', 'Create/edit journal entries',      'إنشاء/تعديل القيود المحاسبية'),
  ('accounting.reports',     'accounting', 'View accounting reports',          'عرض تقارير المحاسبة'),
  -- Sales
  ('sales.view',             'sales',      'View sales module',                'عرض وحدة المبيعات'),
  ('sales.create',           'sales',      'Create sales invoices',            'إنشاء فواتير المبيعات'),
  ('sales.edit',             'sales',      'Edit sales invoices',              'تعديل فواتير المبيعات'),
  ('sales.delete',           'sales',      'Delete sales invoices',            'حذف فواتير المبيعات'),
  -- Purchases
  ('purchases.view',         'purchases',  'View purchases module',            'عرض وحدة المشتريات'),
  ('purchases.create',       'purchases',  'Create purchase invoices',         'إنشاء فواتير المشتريات'),
  ('purchases.edit',         'purchases',  'Edit purchase invoices',           'تعديل فواتير المشتريات'),
  ('purchases.delete',       'purchases',  'Delete purchase invoices',         'حذف فواتير المشتريات'),
  -- Inventory
  ('inventory.view',         'inventory',  'View inventory module',            'عرض وحدة المخزون'),
  ('inventory.manage',       'inventory',  'Manage products and stock',        'إدارة المنتجات والمخزون'),
  ('inventory.movements',    'inventory',  'View stock movements',             'عرض حركات المخزون'),
  -- HR
  ('hr.view',                'hr',         'View HR module',                   'عرض وحدة الموارد البشرية'),
  ('hr.employees',           'hr',         'Manage employees',                 'إدارة الموظفين'),
  ('hr.payroll',             'hr',         'Manage payroll',                   'إدارة الرواتب'),
  -- Treasury
  ('treasury.view',          'treasury',   'View treasury module',             'عرض وحدة الخزينة'),
  ('treasury.transactions',  'treasury',   'Manage treasury transactions',     'إدارة معاملات الخزينة'),
  ('treasury.bank',          'treasury',   'Manage bank accounts',             'إدارة الحسابات البنكية'),
  -- Reports
  ('reports.view',           'reports',    'View reports module',              'عرض وحدة التقارير'),
  ('reports.financial',      'reports',    'View financial reports',           'عرض التقارير المالية'),
  ('reports.export',         'reports',    'Export reports',                   'تصدير التقارير'),
  -- Dashboard
  ('dashboard.view',         'dashboard',  'View dashboard',                   'عرض لوحة التحكم'),
  -- Settings
  ('settings.view',          'settings',   'View settings',                    'عرض الإعدادات'),
  ('settings.manage',        'settings',   'Manage company settings',          'إدارة إعدادات الشركة'),
  -- Contacts
  ('contacts.view',          'contacts',   'View contacts',                    'عرض جهات الاتصال'),
  ('contacts.manage',        'contacts',   'Manage contacts',                  'إدارة جهات الاتصال'),
  -- POS
  ('pos.view',               'pos',        'View POS module',                  'عرض وحدة نقاط البيع'),
  ('pos.sales',              'pos',        'Process POS sales',                'إجراء مبيعات نقطة البيع')
ON CONFLICT (code) DO NOTHING;

-- ─────────────────────────────────────────────────────
-- 4. CREATE: plan_permission_bounds table
-- Stores which permissions are blocked (not allowed) per subscription plan
-- ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.plan_permission_bounds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id UUID NOT NULL REFERENCES public.subscription_plans(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES public.rbac_permissions(id) ON DELETE CASCADE,
    allowed BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (plan_id, permission_id)
);

ALTER TABLE public.plan_permission_bounds ENABLE ROW LEVEL SECURITY;

-- Platform owner can manage all plan permission bounds
CREATE POLICY "Platform owner can manage permission bounds" ON public.plan_permission_bounds
    FOR ALL
    USING (public.has_role(auth.uid(), 'owner'));

-- Authenticated users can view permission bounds (to check their own plan)
CREATE POLICY "Authenticated can view permission bounds" ON public.plan_permission_bounds
    FOR SELECT
    USING (auth.uid() IS NOT NULL);

-- ─────────────────────────────────────────────────────
-- 5. CREATE: get_company_features RPC function
-- Returns feature limits for a company (with custom override support)
-- ─────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_company_features(p_company_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan RECORD;
  v_override RECORD;
  v_result JSONB;
BEGIN
  -- Get active subscription + plan info
  SELECT
    sp.name_ar AS plan_name_ar,
    sp.name_en AS plan_name,
    sp.price,
    sp.id AS plan_id,
    COALESCE(sp.allowed_modules, ARRAY[]::TEXT[]) AS allowed_modules
  INTO v_plan
  FROM public.subscriptions s
  JOIN public.subscription_plans sp ON sp.id = s.plan_id
  WHERE s.company_id = p_company_id
    AND s.status IN ('active', 'trialing')
  ORDER BY s.created_at DESC
  LIMIT 1;

  -- Get override if exists
  SELECT *
  INTO v_override
  FROM public.company_feature_overrides
  WHERE company_id = p_company_id;

  -- Build result
  v_result := jsonb_build_object(
    'plan_id',                COALESCE(v_plan.plan_id, NULL),
    'plan_name',              COALESCE(v_plan.plan_name, 'No Plan'),
    'plan_name_ar',           COALESCE(v_plan.plan_name_ar, 'بدون باقة'),
    'price',                  COALESCE(v_plan.price, 0),
    'has_custom_override',    COALESCE(v_override.custom_override, false),
    'max_journal_entries',    CASE
                                WHEN v_override.custom_override AND v_override.max_journal_entries IS NOT NULL
                                THEN v_override.max_journal_entries
                                ELSE NULL
                              END,
    'max_sales_invoices',     CASE
                                WHEN v_override.custom_override AND v_override.max_sales_invoices IS NOT NULL
                                THEN v_override.max_sales_invoices
                                ELSE NULL
                              END,
    'max_purchase_invoices',  CASE
                                WHEN v_override.custom_override AND v_override.max_purchase_invoices IS NOT NULL
                                THEN v_override.max_purchase_invoices
                                ELSE NULL
                              END,
    'max_users',              CASE
                                WHEN v_override.custom_override AND v_override.max_users IS NOT NULL
                                THEN v_override.max_users
                                ELSE NULL
                              END
  );

  RETURN v_result;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.get_company_features(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_company_features(UUID) TO service_role;

-- ─────────────────────────────────────────────────────
-- 6. UPDATE trigger for company_feature_overrides
-- ─────────────────────────────────────────────────────
CREATE TRIGGER update_company_feature_overrides_updated_at
    BEFORE UPDATE ON public.company_feature_overrides
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
