-- ==========================================================
-- SEED DATA & FUNCTIONS (run after complete_schema.sql + all_policies_fixed.sql)
-- ==========================================================

-- ╔═══════════════════════════════════════════════════════════╗
-- ║  1. HELPER FUNCTIONS                                     ║
-- ╚═══════════════════════════════════════════════════════════╝

-- update_updated_at_column trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- handle_new_user: auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (user_id, full_name)
    VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name')
    ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger (drop first to be safe)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- has_role function
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = _user_id AND role = _role
    )
$$;

-- is_company_owner function
CREATE OR REPLACE FUNCTION public.is_company_owner(_company_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.companies
        WHERE id = _company_id AND owner_id = auth.uid()
    )
$$;

-- is_company_member function
CREATE OR REPLACE FUNCTION public.is_company_member(_company_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.companies
        WHERE id = _company_id AND owner_id = auth.uid()
    )
    OR EXISTS (
        SELECT 1 FROM public.company_members
        WHERE company_id = _company_id
          AND user_id = auth.uid()
          AND is_active = true
    )
$$;

-- ╔═══════════════════════════════════════════════════════════╗
-- ║  2. DEFAULT CHART OF ACCOUNTS FUNCTION (FULL VERSION)    ║
-- ╚═══════════════════════════════════════════════════════════╝

CREATE OR REPLACE FUNCTION public.create_default_chart_of_accounts(p_company_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  -- Check if company already has accounts
  SELECT COUNT(*) INTO v_count FROM accounts WHERE company_id = p_company_id;
  IF v_count > 0 THEN
    RETURN;
  END IF;

  -- Assets (1)
  INSERT INTO accounts (company_id, code, name, name_en, type, is_parent, is_system, sort_order) VALUES
  (p_company_id, '1', 'الأصول', 'Assets', 'asset', true, true, 1);

  INSERT INTO accounts (company_id, code, name, name_en, type, is_parent, is_system, sort_order, parent_id) VALUES
  (p_company_id, '11', 'الأصول المتداولة', 'Current Assets', 'asset', true, true, 2, (SELECT id FROM accounts WHERE company_id = p_company_id AND code = '1'));

  INSERT INTO accounts (company_id, code, name, name_en, type, is_parent, is_system, sort_order, parent_id) VALUES
  (p_company_id, '111', 'النقدية والبنوك', 'Cash and Banks', 'asset', true, true, 3, (SELECT id FROM accounts WHERE company_id = p_company_id AND code = '11')),
  (p_company_id, '112', 'الذمم المدينة', 'Accounts Receivable', 'asset', true, true, 4, (SELECT id FROM accounts WHERE company_id = p_company_id AND code = '11')),
  (p_company_id, '113', 'المخزون', 'Inventory', 'asset', true, true, 5, (SELECT id FROM accounts WHERE company_id = p_company_id AND code = '11'));

  INSERT INTO accounts (company_id, code, name, name_en, type, is_parent, is_system, sort_order, parent_id) VALUES
  (p_company_id, '1111', 'الصندوق', 'Cash', 'asset', false, true, 6, (SELECT id FROM accounts WHERE company_id = p_company_id AND code = '111')),
  (p_company_id, '1112', 'البنك', 'Bank', 'asset', false, true, 7, (SELECT id FROM accounts WHERE company_id = p_company_id AND code = '111'));

  INSERT INTO accounts (company_id, code, name, name_en, type, is_parent, is_system, sort_order, parent_id) VALUES
  (p_company_id, '12', 'الأصول الثابتة', 'Fixed Assets', 'asset', true, true, 10, (SELECT id FROM accounts WHERE company_id = p_company_id AND code = '1'));

  INSERT INTO accounts (company_id, code, name, name_en, type, is_parent, is_system, sort_order, parent_id) VALUES
  (p_company_id, '121', 'المباني', 'Buildings', 'asset', false, true, 11, (SELECT id FROM accounts WHERE company_id = p_company_id AND code = '12')),
  (p_company_id, '122', 'الآلات والمعدات', 'Machinery & Equipment', 'asset', false, true, 12, (SELECT id FROM accounts WHERE company_id = p_company_id AND code = '12')),
  (p_company_id, '123', 'الأثاث والتجهيزات', 'Furniture & Fixtures', 'asset', false, true, 13, (SELECT id FROM accounts WHERE company_id = p_company_id AND code = '12')),
  (p_company_id, '124', 'وسائل النقل', 'Vehicles', 'asset', false, true, 14, (SELECT id FROM accounts WHERE company_id = p_company_id AND code = '12'));

  -- Liabilities (2)
  INSERT INTO accounts (company_id, code, name, name_en, type, is_parent, is_system, sort_order) VALUES
  (p_company_id, '2', 'الخصوم', 'Liabilities', 'liability', true, true, 20);

  INSERT INTO accounts (company_id, code, name, name_en, type, is_parent, is_system, sort_order, parent_id) VALUES
  (p_company_id, '21', 'الخصوم المتداولة', 'Current Liabilities', 'liability', true, true, 21, (SELECT id FROM accounts WHERE company_id = p_company_id AND code = '2'));

  INSERT INTO accounts (company_id, code, name, name_en, type, is_parent, is_system, sort_order, parent_id) VALUES
  (p_company_id, '211', 'الذمم الدائنة', 'Accounts Payable', 'liability', true, true, 22, (SELECT id FROM accounts WHERE company_id = p_company_id AND code = '21')),
  (p_company_id, '212', 'ضريبة القيمة المضافة', 'VAT Payable', 'liability', false, true, 23, (SELECT id FROM accounts WHERE company_id = p_company_id AND code = '21'));

  INSERT INTO accounts (company_id, code, name, name_en, type, is_parent, is_system, sort_order, parent_id) VALUES
  (p_company_id, '22', 'الخصوم طويلة الأجل', 'Long-term Liabilities', 'liability', true, true, 25, (SELECT id FROM accounts WHERE company_id = p_company_id AND code = '2'));

  INSERT INTO accounts (company_id, code, name, name_en, type, is_parent, is_system, sort_order, parent_id) VALUES
  (p_company_id, '221', 'القروض', 'Loans', 'liability', false, true, 26, (SELECT id FROM accounts WHERE company_id = p_company_id AND code = '22'));

  -- Equity (3)
  INSERT INTO accounts (company_id, code, name, name_en, type, is_parent, is_system, sort_order) VALUES
  (p_company_id, '3', 'حقوق الملكية', 'Equity', 'equity', true, true, 30);

  INSERT INTO accounts (company_id, code, name, name_en, type, is_parent, is_system, sort_order, parent_id) VALUES
  (p_company_id, '31', 'رأس المال', 'Capital', 'equity', false, true, 31, (SELECT id FROM accounts WHERE company_id = p_company_id AND code = '3')),
  (p_company_id, '32', 'الأرباح المحتجزة', 'Retained Earnings', 'equity', false, true, 32, (SELECT id FROM accounts WHERE company_id = p_company_id AND code = '3')),
  (p_company_id, '33', 'أرباح/خسائر العام', 'Current Year P/L', 'equity', false, true, 33, (SELECT id FROM accounts WHERE company_id = p_company_id AND code = '3'));

  -- Revenue (4)
  INSERT INTO accounts (company_id, code, name, name_en, type, is_parent, is_system, sort_order) VALUES
  (p_company_id, '4', 'الإيرادات', 'Revenue', 'revenue', true, true, 40);

  INSERT INTO accounts (company_id, code, name, name_en, type, is_parent, is_system, sort_order, parent_id) VALUES
  (p_company_id, '41', 'إيرادات المبيعات', 'Sales Revenue', 'revenue', false, true, 41, (SELECT id FROM accounts WHERE company_id = p_company_id AND code = '4')),
  (p_company_id, '42', 'إيرادات الخدمات', 'Service Revenue', 'revenue', false, true, 42, (SELECT id FROM accounts WHERE company_id = p_company_id AND code = '4')),
  (p_company_id, '43', 'إيرادات أخرى', 'Other Revenue', 'revenue', false, true, 43, (SELECT id FROM accounts WHERE company_id = p_company_id AND code = '4'));

  -- Expenses (5)
  INSERT INTO accounts (company_id, code, name, name_en, type, is_parent, is_system, sort_order) VALUES
  (p_company_id, '5', 'المصروفات', 'Expenses', 'expense', true, true, 50);

  INSERT INTO accounts (company_id, code, name, name_en, type, is_parent, is_system, sort_order, parent_id) VALUES
  (p_company_id, '51', 'تكلفة المبيعات', 'Cost of Sales', 'expense', true, true, 51, (SELECT id FROM accounts WHERE company_id = p_company_id AND code = '5'));

  INSERT INTO accounts (company_id, code, name, name_en, type, is_parent, is_system, sort_order, parent_id) VALUES
  (p_company_id, '511', 'تكلفة البضاعة المباعة', 'Cost of Goods Sold', 'expense', false, true, 52, (SELECT id FROM accounts WHERE company_id = p_company_id AND code = '51'));

  INSERT INTO accounts (company_id, code, name, name_en, type, is_parent, is_system, sort_order, parent_id) VALUES
  (p_company_id, '52', 'المصروفات الإدارية', 'Administrative Expenses', 'expense', true, true, 53, (SELECT id FROM accounts WHERE company_id = p_company_id AND code = '5'));

  INSERT INTO accounts (company_id, code, name, name_en, type, is_parent, is_system, sort_order, parent_id) VALUES
  (p_company_id, '521', 'الرواتب والأجور', 'Salaries & Wages', 'expense', false, true, 54, (SELECT id FROM accounts WHERE company_id = p_company_id AND code = '52')),
  (p_company_id, '522', 'الإيجارات', 'Rent', 'expense', false, true, 55, (SELECT id FROM accounts WHERE company_id = p_company_id AND code = '52')),
  (p_company_id, '523', 'المرافق', 'Utilities', 'expense', false, true, 56, (SELECT id FROM accounts WHERE company_id = p_company_id AND code = '52')),
  (p_company_id, '524', 'مصروفات أخرى', 'Other Expenses', 'expense', false, true, 57, (SELECT id FROM accounts WHERE company_id = p_company_id AND code = '52'));

  INSERT INTO accounts (company_id, code, name, name_en, type, is_parent, is_system, sort_order, parent_id) VALUES
  (p_company_id, '53', 'مصروفات البيع والتسويق', 'Sales & Marketing Expenses', 'expense', true, true, 58, (SELECT id FROM accounts WHERE company_id = p_company_id AND code = '5'));

  INSERT INTO accounts (company_id, code, name, name_en, type, is_parent, is_system, sort_order, parent_id) VALUES
  (p_company_id, '531', 'مصروفات الإعلان', 'Advertising', 'expense', false, true, 59, (SELECT id FROM accounts WHERE company_id = p_company_id AND code = '53')),
  (p_company_id, '532', 'مصروفات التسويق', 'Marketing', 'expense', false, true, 60, (SELECT id FROM accounts WHERE company_id = p_company_id AND code = '53'));

  -- Additional Current Assets
  INSERT INTO accounts (company_id, code, name, name_en, type, is_parent, is_system, sort_order, parent_id) VALUES
  (p_company_id, '114', 'مصروفات مدفوعة مقدماً', 'Prepaid Expenses', 'asset', false, true, 8,
    (SELECT id FROM accounts WHERE company_id = p_company_id AND code = '11')),
  (p_company_id, '115', 'ضريبة القيمة المضافة - مشتريات', 'VAT Receivable', 'asset', false, true, 9,
    (SELECT id FROM accounts WHERE company_id = p_company_id AND code = '11')),
  (p_company_id, '116', 'أطراف ذات علاقة مدينة', 'Due from Related Parties', 'asset', false, true, 10,
    (SELECT id FROM accounts WHERE company_id = p_company_id AND code = '11'));

  -- Additional Current Liabilities
  INSERT INTO accounts (company_id, code, name, name_en, type, is_parent, is_system, sort_order, parent_id) VALUES
  (p_company_id, '213', 'ضريبة القيمة المضافة - مبيعات', 'VAT Payable - Sales', 'liability', false, true, 24,
    (SELECT id FROM accounts WHERE company_id = p_company_id AND code = '21')),
  (p_company_id, '214', 'تسوية ضريبة القيمة المضافة', 'VAT Clearing', 'liability', false, true, 25,
    (SELECT id FROM accounts WHERE company_id = p_company_id AND code = '21')),
  (p_company_id, '215', 'مخصص الزكاة الشرعية', 'Zakat Provision', 'liability', false, true, 26,
    (SELECT id FROM accounts WHERE company_id = p_company_id AND code = '21')),
  (p_company_id, '216', 'أطراف ذات علاقة دائنة', 'Due to Related Parties', 'liability', false, true, 27,
    (SELECT id FROM accounts WHERE company_id = p_company_id AND code = '21')),
  (p_company_id, '217', 'قروض قصيرة الأجل', 'Short-term Loans', 'liability', false, true, 28,
    (SELECT id FROM accounts WHERE company_id = p_company_id AND code = '21'));

  -- Additional Long-term Liabilities
  INSERT INTO accounts (company_id, code, name, name_en, type, is_parent, is_system, sort_order, parent_id) VALUES
  (p_company_id, '222', 'مخصص مكافأة نهاية الخدمة', 'End of Service Provision', 'liability', false, true, 29,
    (SELECT id FROM accounts WHERE company_id = p_company_id AND code = '22')),
  (p_company_id, '223', 'قروض طويلة الأجل', 'Long-term Loans', 'liability', false, true, 30,
    (SELECT id FROM accounts WHERE company_id = p_company_id AND code = '22'));

  -- Additional Equity
  INSERT INTO accounts (company_id, code, name, name_en, type, is_parent, is_system, sort_order, parent_id) VALUES
  (p_company_id, '34', 'احتياطي نظامي', 'Statutory Reserve', 'equity', false, true, 34,
    (SELECT id FROM accounts WHERE company_id = p_company_id AND code = '3'));
END;
$$;

-- ╔═══════════════════════════════════════════════════════════╗
-- ║  2b. TRIGGER: Auto-create accounts on new company        ║
-- ╚═══════════════════════════════════════════════════════════╝

CREATE OR REPLACE FUNCTION public.trigger_create_default_accounts()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM create_default_chart_of_accounts(NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_company_created_add_accounts ON public.companies;
CREATE TRIGGER on_company_created_add_accounts
  AFTER INSERT ON public.companies
  FOR EACH ROW
  EXECUTE FUNCTION trigger_create_default_accounts();

-- ╔═══════════════════════════════════════════════════════════╗
-- ║  2c. get_enriched_audit_logs RPC                         ║
-- ╚═══════════════════════════════════════════════════════════╝

CREATE OR REPLACE FUNCTION public.get_enriched_audit_logs(
    p_limit INTEGER DEFAULT 100,
    p_offset INTEGER DEFAULT 0,
    p_table_name TEXT DEFAULT NULL,
    p_operation_type TEXT DEFAULT NULL,
    p_search_query TEXT DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    operation_type TEXT,
    table_name TEXT,
    record_id UUID,
    old_data JSONB,
    new_data JSONB,
    details TEXT,
    created_at TIMESTAMPTZ,
    company_id UUID,
    user_id UUID,
    user_name TEXT,
    user_email TEXT,
    company_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NOT public.has_role(auth.uid(), 'owner') THEN
        RAISE EXCEPTION 'Access denied. Owner role required.';
    END IF;

    RETURN QUERY
    SELECT
        a.id,
        a.operation_type,
        a.table_name,
        a.record_id,
        a.old_data,
        a.new_data,
        a.details,
        a.created_at,
        a.company_id,
        a.user_id,
        p.full_name AS user_name,
        u.email::TEXT AS user_email,
        c.name AS company_name
    FROM public.audit_logs a
    LEFT JOIN public.profiles p ON p.user_id = a.user_id
    LEFT JOIN auth.users u ON u.id = a.user_id
    LEFT JOIN public.companies c ON c.id = a.company_id
    WHERE
        (p_table_name IS NULL OR a.table_name = p_table_name) AND
        (p_operation_type IS NULL OR a.operation_type = p_operation_type) AND
        (p_search_query IS NULL OR
         a.details ILIKE '%' || p_search_query || '%' OR
         p.full_name ILIKE '%' || p_search_query || '%' OR
         u.email ILIKE '%' || p_search_query || '%')
    ORDER BY a.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$;

-- ╔═══════════════════════════════════════════════════════════╗
-- ║  2d. get_company_features RPC                            ║
-- ╚═══════════════════════════════════════════════════════════╝

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
  SELECT
    sp.name_ar AS plan_name_ar,
    sp.name_en AS plan_name,
    sp.price,
    sp.id AS plan_id
  INTO v_plan
  FROM public.subscriptions s
  JOIN public.subscription_plans sp ON sp.id = s.plan_id
  WHERE s.company_id = p_company_id
    AND s.status IN ('active', 'trialing')
  ORDER BY s.created_at DESC
  LIMIT 1;

  SELECT *
  INTO v_override
  FROM public.company_feature_overrides
  WHERE company_id = p_company_id;

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

GRANT EXECUTE ON FUNCTION public.get_company_features(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_company_features(UUID) TO service_role;

-- ╔═══════════════════════════════════════════════════════════╗
-- ║  2e. SEED: RBAC Permissions                              ║
-- ╚═══════════════════════════════════════════════════════════╝

INSERT INTO public.rbac_permissions (code, module, description, description_ar) VALUES
  ('accounting.view',        'accounting', 'View accounting module',           'عرض وحدة المحاسبة'),
  ('accounting.journals',    'accounting', 'Create/edit journal entries',      'إنشاء/تعديل القيود المحاسبية'),
  ('accounting.reports',     'accounting', 'View accounting reports',          'عرض تقارير المحاسبة'),
  ('sales.view',             'sales',      'View sales module',                'عرض وحدة المبيعات'),
  ('sales.create',           'sales',      'Create sales invoices',            'إنشاء فواتير المبيعات'),
  ('sales.edit',             'sales',      'Edit sales invoices',              'تعديل فواتير المبيعات'),
  ('sales.delete',           'sales',      'Delete sales invoices',            'حذف فواتير المبيعات'),
  ('purchases.view',         'purchases',  'View purchases module',            'عرض وحدة المشتريات'),
  ('purchases.create',       'purchases',  'Create purchase invoices',         'إنشاء فواتير المشتريات'),
  ('purchases.edit',         'purchases',  'Edit purchase invoices',           'تعديل فواتير المشتريات'),
  ('purchases.delete',       'purchases',  'Delete purchase invoices',         'حذف فواتير المشتريات'),
  ('inventory.view',         'inventory',  'View inventory module',            'عرض وحدة المخزون'),
  ('inventory.manage',       'inventory',  'Manage products and stock',        'إدارة المنتجات والمخزون'),
  ('inventory.movements',    'inventory',  'View stock movements',             'عرض حركات المخزون'),
  ('hr.view',                'hr',         'View HR module',                   'عرض وحدة الموارد البشرية'),
  ('hr.employees',           'hr',         'Manage employees',                 'إدارة الموظفين'),
  ('hr.payroll',             'hr',         'Manage payroll',                   'إدارة الرواتب'),
  ('treasury.view',          'treasury',   'View treasury module',             'عرض وحدة الخزينة'),
  ('treasury.transactions',  'treasury',   'Manage treasury transactions',     'إدارة معاملات الخزينة'),
  ('treasury.bank',          'treasury',   'Manage bank accounts',             'إدارة الحسابات البنكية'),
  ('reports.view',           'reports',    'View reports module',              'عرض وحدة التقارير'),
  ('reports.financial',      'reports',    'View financial reports',           'عرض التقارير المالية'),
  ('reports.export',         'reports',    'Export reports',                   'تصدير التقارير'),
  ('dashboard.view',         'dashboard',  'View dashboard',                   'عرض لوحة التحكم'),
  ('settings.view',          'settings',   'View settings',                    'عرض الإعدادات'),
  ('settings.manage',        'settings',   'Manage company settings',          'إدارة إعدادات الشركة'),
  ('contacts.view',          'contacts',   'View contacts',                    'عرض جهات الاتصال'),
  ('contacts.manage',        'contacts',   'Manage contacts',                  'إدارة جهات الاتصال'),
  ('pos.view',               'pos',        'View POS module',                  'عرض وحدة نقاط البيع'),
  ('pos.sales',              'pos',        'Process POS sales',                'إجراء مبيعات نقطة البيع')
ON CONFLICT (code) DO NOTHING;


-- ╔═══════════════════════════════════════════════════════════╗
-- ║  3. PROVISION_TENANT RPC FUNCTION                        ║
-- ╚═══════════════════════════════════════════════════════════╝

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
  -- 1. Create company
  INSERT INTO public.companies (
    owner_id, name, name_en, email, phone,
    commercial_register, tax_number, activity_type, address,
    currency
  ) VALUES (
    p_user_id, p_name, p_name_en, p_email, p_phone,
    p_commercial_register, p_tax_number, p_activity_type, p_address,
    COALESCE(p_base_currency, 'SAR')
  )
  RETURNING id INTO v_company_id;

  -- 2. Resolve subscription plan
  IF p_plan_id IS NOT NULL THEN
    SELECT id INTO v_plan_id
    FROM public.subscription_plans
    WHERE id = p_plan_id AND is_active = true;
  END IF;

  IF v_plan_id IS NULL THEN
    SELECT id INTO v_plan_id
    FROM public.subscription_plans
    WHERE is_active = true
    ORDER BY sort_order ASC, price ASC
    LIMIT 1;
  END IF;

  -- 3. Get plan duration
  SELECT COALESCE(duration_months, 12) INTO v_duration_months
  FROM public.subscription_plans
  WHERE id = v_plan_id;

  -- 4. Create subscription with trialing status
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

  -- 5. Create a default branch
  INSERT INTO public.branches (company_id, name, name_en, is_main, is_active)
  VALUES (v_company_id, p_name, p_name_en, true, true);

  -- 6. Create default chart of accounts
  PERFORM public.create_default_chart_of_accounts(v_company_id);

  -- 7. Insert user role as 'client'
  INSERT INTO public.user_roles (user_id, role)
  VALUES (p_user_id, 'client'::app_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN v_company_id;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.provision_tenant(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, UUID, TEXT, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.provision_tenant(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, UUID, TEXT, TEXT, TEXT, TEXT) TO service_role;


-- ╔═══════════════════════════════════════════════════════════╗
-- ║  4. SEED DATA: SYSTEM SCREENS                            ║
-- ╚═══════════════════════════════════════════════════════════╝

INSERT INTO public.system_screens (key, name_ar, name_en, module, sort_order) VALUES
-- Settings Module
('company_settings', 'إعدادات الشركة', 'Company Settings', 'settings', 1),
('users_management', 'إدارة المستخدمين', 'Users Management', 'settings', 2),
('branches', 'الفروع', 'Branches', 'settings', 3),
('chart_of_accounts', 'شجرة الحسابات', 'Chart of Accounts', 'settings', 4),
-- Sales Module
('sales_invoices', 'فواتير المبيعات', 'Sales Invoices', 'sales', 10),
('purchase_invoices', 'فواتير المشتريات', 'Purchase Invoices', 'sales', 11),
('quotes', 'عروض الأسعار', 'Quotes', 'sales', 12),
('customers', 'العملاء', 'Customers', 'sales', 13),
('suppliers', 'الموردين', 'Suppliers', 'sales', 14),
-- Inventory Module
('products', 'المنتجات', 'Products', 'inventory', 20),
('warehouses', 'المستودعات', 'Warehouses', 'inventory', 21),
('stock_movements', 'حركات المخزون', 'Stock Movements', 'inventory', 22),
('stock_alerts', 'تنبيهات المخزون', 'Stock Alerts', 'inventory', 23),
-- Accounting Module
('journal_entries', 'قيود اليومية', 'Journal Entries', 'accounting', 30),
('ledger', 'دفتر الأستاذ', 'Ledger', 'accounting', 31),
('trial_balance', 'ميزان المراجعة', 'Trial Balance', 'accounting', 32),
('income_statement', 'قائمة الدخل', 'Income Statement', 'accounting', 33),
('balance_sheet', 'الميزانية العمومية', 'Balance Sheet', 'accounting', 34),
('cash_flow', 'التدفقات النقدية', 'Cash Flow', 'accounting', 35),
-- HR Module
('employees', 'الموظفين', 'Employees', 'hr', 40),
('attendance', 'الحضور والانصراف', 'Attendance', 'hr', 41),
('leaves', 'الإجازات', 'Leaves', 'hr', 42),
('advances', 'السلف', 'Advances', 'hr', 43),
('penalties', 'الجزاءات', 'Penalties', 'hr', 44),
('rewards', 'المكافآت', 'Rewards', 'hr', 45),
('payroll', 'الرواتب', 'Payroll', 'hr', 46),
-- Reports
('sales_report', 'تقرير المبيعات', 'Sales Report', 'reports', 50),
('inventory_report', 'تقرير المخزون', 'Inventory Report', 'reports', 51),
('hr_report', 'تقرير الموارد البشرية', 'HR Report', 'reports', 52)
ON CONFLICT (key) DO NOTHING;


-- ╔═══════════════════════════════════════════════════════════╗
-- ║  5. SEED DATA: SUBSCRIPTION PLANS                        ║
-- ╚═══════════════════════════════════════════════════════════╝

INSERT INTO public.subscription_plans (name_ar, name_en, description_ar, description_en, price, duration_months, max_invoices, max_entries, max_users, max_branches, sort_order, is_active) VALUES
('مجاني', 'Free', 'للتجربة والمشاريع الصغيرة', 'For trial and small projects', 0, 12, 50, 100, 1, 1, 1, true),
('أساسي', 'Basic', 'للأعمال الصغيرة', 'For small businesses', 199, 1, 500, 1000, 3, 2, 2, true),
('متقدم', 'Advanced', 'للأعمال المتوسطة', 'For medium businesses', 399, 1, 2000, 5000, 10, 5, 3, true),
('مؤسسات', 'Enterprise', 'للشركات الكبيرة', 'For large companies', 799, 1, NULL, NULL, NULL, NULL, 4, true);


-- ╔═══════════════════════════════════════════════════════════╗
-- ║  6. ENSURE PROFILE EXISTS FOR CURRENT USER               ║
-- ╚═══════════════════════════════════════════════════════════╝

-- Make sure the current auth user has a profile row
INSERT INTO public.profiles (user_id, full_name)
SELECT id, raw_user_meta_data->>'full_name'
FROM auth.users
WHERE NOT EXISTS (
  SELECT 1 FROM public.profiles WHERE profiles.user_id = auth.users.id
)
ON CONFLICT (user_id) DO NOTHING;


-- ╔═══════════════════════════════════════════════════════════╗
-- ║  7. MAKE EXISTING USER A PLATFORM OWNER                  ║
-- ╚═══════════════════════════════════════════════════════════╝

-- If you want user 036b1cb8-... to be a platform owner, uncomment the line below:
-- INSERT INTO public.user_roles (user_id, role) VALUES ('036b1cb8-f510-4357-9634-7ee8a19f3c07', 'owner') ON CONFLICT (user_id, role) DO NOTHING;

-- ==========================================================
-- DONE! Now go to https://www.costamine.com/register-company
-- to register your company. The provision-tenant edge function
-- will create the company, subscription, branch, and accounts.
-- ==========================================================
