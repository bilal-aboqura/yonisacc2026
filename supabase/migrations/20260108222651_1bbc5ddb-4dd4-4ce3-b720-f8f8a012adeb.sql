-- Create roles enum
CREATE TYPE public.app_role AS ENUM ('owner', 'admin', 'client', 'accountant', 'sales', 'hr');

-- Create subscription status enum
CREATE TYPE public.subscription_status AS ENUM ('pending', 'active', 'expired', 'cancelled');

-- Create transaction type enum
CREATE TYPE public.transaction_type AS ENUM ('debit', 'credit');

-- Create invoice type enum
CREATE TYPE public.invoice_type AS ENUM ('sales', 'purchase', 'quote');

-- Create leave type enum
CREATE TYPE public.leave_type AS ENUM ('annual', 'sick', 'unpaid', 'emergency');

-- Create penalty type enum
CREATE TYPE public.penalty_type AS ENUM ('warning', 'deduction', 'suspension');

-- =============================================
-- PROFILES TABLE
-- =============================================
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    full_name TEXT,
    phone TEXT,
    avatar_url TEXT,
    language TEXT DEFAULT 'ar',
    theme TEXT DEFAULT 'light',
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- =============================================
-- USER ROLES TABLE (SECURITY)
-- =============================================
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles
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

CREATE POLICY "Users can view own roles" ON public.user_roles
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Owners can manage roles" ON public.user_roles
    FOR ALL USING (public.has_role(auth.uid(), 'owner'));

-- =============================================
-- SYSTEM SCREENS TABLE
-- =============================================
CREATE TABLE public.system_screens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT NOT NULL UNIQUE,
    name_ar TEXT NOT NULL,
    name_en TEXT NOT NULL,
    description_ar TEXT,
    description_en TEXT,
    module TEXT NOT NULL,
    icon TEXT,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.system_screens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view screens" ON public.system_screens
    FOR SELECT USING (true);

-- =============================================
-- SUBSCRIPTION PLANS TABLE
-- =============================================
CREATE TABLE public.subscription_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name_ar TEXT NOT NULL,
    name_en TEXT NOT NULL,
    description_ar TEXT,
    description_en TEXT,
    price DECIMAL(10,2) NOT NULL DEFAULT 0,
    duration_months INTEGER NOT NULL DEFAULT 1,
    max_invoices INTEGER,
    max_entries INTEGER,
    max_users INTEGER DEFAULT 1,
    max_branches INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active plans" ON public.subscription_plans
    FOR SELECT USING (is_active = true);

CREATE POLICY "Owners can manage plans" ON public.subscription_plans
    FOR ALL USING (public.has_role(auth.uid(), 'owner'));

-- =============================================
-- PLAN SCREENS (Many-to-Many)
-- =============================================
CREATE TABLE public.plan_screens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id UUID REFERENCES public.subscription_plans(id) ON DELETE CASCADE NOT NULL,
    screen_id UUID REFERENCES public.system_screens(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    UNIQUE (plan_id, screen_id)
);

ALTER TABLE public.plan_screens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view plan screens" ON public.plan_screens
    FOR SELECT USING (true);

CREATE POLICY "Owners can manage plan screens" ON public.plan_screens
    FOR ALL USING (public.has_role(auth.uid(), 'owner'));

-- =============================================
-- COMPANIES TABLE
-- =============================================
CREATE TABLE public.companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    name_en TEXT,
    logo_url TEXT,
    phone TEXT,
    email TEXT,
    address TEXT,
    tax_number TEXT,
    commercial_register TEXT,
    activity_type TEXT,
    currency TEXT DEFAULT 'SAR',
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members can view" ON public.companies
    FOR SELECT USING (owner_id = auth.uid());

CREATE POLICY "Company owner can manage" ON public.companies
    FOR ALL USING (owner_id = auth.uid());

-- =============================================
-- SUBSCRIPTIONS TABLE
-- =============================================
CREATE TABLE public.subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
    plan_id UUID REFERENCES public.subscription_plans(id) NOT NULL,
    status subscription_status DEFAULT 'pending' NOT NULL,
    start_date DATE,
    end_date DATE,
    invoices_used INTEGER DEFAULT 0,
    entries_used INTEGER DEFAULT 0,
    payment_reference TEXT,
    payment_date TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company owner can view subscriptions" ON public.subscriptions
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.companies WHERE id = company_id AND owner_id = auth.uid())
    );

CREATE POLICY "Owners can manage all subscriptions" ON public.subscriptions
    FOR ALL USING (public.has_role(auth.uid(), 'owner'));

-- =============================================
-- CLIENT CUSTOM SCREENS
-- =============================================
CREATE TABLE public.client_screens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
    screen_id UUID REFERENCES public.system_screens(id) ON DELETE CASCADE NOT NULL,
    is_enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    UNIQUE (company_id, screen_id)
);

ALTER TABLE public.client_screens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company owner can view custom screens" ON public.client_screens
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.companies WHERE id = company_id AND owner_id = auth.uid())
    );

CREATE POLICY "Owners can manage client screens" ON public.client_screens
    FOR ALL USING (public.has_role(auth.uid(), 'owner'));

-- =============================================
-- BRANCHES TABLE
-- =============================================
CREATE TABLE public.branches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    name_en TEXT,
    phone TEXT,
    address TEXT,
    is_main BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members can view branches" ON public.branches
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.companies WHERE id = company_id AND owner_id = auth.uid())
    );

CREATE POLICY "Company owner can manage branches" ON public.branches
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.companies WHERE id = company_id AND owner_id = auth.uid())
    );

-- =============================================
-- CONTACT MESSAGES TABLE
-- =============================================
CREATE TABLE public.contact_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert messages" ON public.contact_messages
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Owners can view messages" ON public.contact_messages
    FOR SELECT USING (public.has_role(auth.uid(), 'owner'));

CREATE POLICY "Owners can update messages" ON public.contact_messages
    FOR UPDATE USING (public.has_role(auth.uid(), 'owner'));

-- =============================================
-- TESTIMONIALS TABLE
-- =============================================
CREATE TABLE public.testimonials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    company TEXT,
    content_ar TEXT NOT NULL,
    content_en TEXT NOT NULL,
    rating INTEGER DEFAULT 5,
    avatar_url TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.testimonials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active testimonials" ON public.testimonials
    FOR SELECT USING (is_active = true);

CREATE POLICY "Owners can manage testimonials" ON public.testimonials
    FOR ALL USING (public.has_role(auth.uid(), 'owner'));

-- =============================================
-- TRIGGER FOR UPDATED_AT
-- =============================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_companies_updated_at
    BEFORE UPDATE ON public.companies
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at
    BEFORE UPDATE ON public.subscriptions
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_branches_updated_at
    BEFORE UPDATE ON public.branches
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_subscription_plans_updated_at
    BEFORE UPDATE ON public.subscription_plans
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- TRIGGER TO CREATE PROFILE ON SIGNUP
-- =============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (user_id, full_name)
    VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================
-- INSERT DEFAULT SYSTEM SCREENS
-- =============================================
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
('hr_report', 'تقرير الموارد البشرية', 'HR Report', 'reports', 52);

-- =============================================
-- INSERT DEFAULT SUBSCRIPTION PLANS
-- =============================================
INSERT INTO public.subscription_plans (name_ar, name_en, description_ar, description_en, price, duration_months, max_invoices, max_entries, max_users, max_branches, sort_order) VALUES
('مجاني', 'Free', 'للتجربة والمشاريع الصغيرة', 'For trial and small projects', 0, 12, 50, 100, 1, 1, 1),
('أساسي', 'Basic', 'للأعمال الصغيرة', 'For small businesses', 199, 1, 500, 1000, 3, 2, 2),
('متقدم', 'Advanced', 'للأعمال المتوسطة', 'For medium businesses', 399, 1, 2000, 5000, 10, 5, 3),
('مؤسسات', 'Enterprise', 'للشركات الكبيرة', 'For large companies', 799, 1, NULL, NULL, NULL, NULL, 4);