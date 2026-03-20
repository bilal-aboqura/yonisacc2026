-- =============================================
-- MIGRATION: Create Missing Module Tables
-- =============================================
-- This migration creates all missing tables for HR, Inventory, POS, and other modules
-- that are causing 404 errors in the application.

-- Enable extension for UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================
-- COMPANIES TABLE (Must be created first as other tables depend on it)
-- =============================================

CREATE TABLE IF NOT EXISTS public.companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
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
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ DEFAULT NULL
);

ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members can view companies" ON public.companies
    FOR SELECT USING (EXISTS (
        SELECT 1 FROM public.company_members
        WHERE company_id = com.id
        AND user_id = auth.uid()
        AND is_active = true
    ));

CREATE POLICY "Company owner can manage companies" ON public.companies
    FOR ALL USING (EXISTS (
        SELECT 1 FROM public.companies
        WHERE id = com.id
        AND owner_id = auth.uid()
    ));

-- =============================================

-- =============================================
-- HR MODULE TABLES
-- =============================================

CREATE TABLE IF NOT EXISTS public.hr_employees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    name_en TEXT,
    employee_number TEXT UNIQUE,
    national_id TEXT,
    job_title TEXT,
    department_id UUID REFERENCES public.hr_departments(id),
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'terminated')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.hr_work_shifts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    name_en TEXT,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.hr_departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    name_en TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.hr_leaves (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    employee_id UUID REFERENCES public.hr_employees(id) ON DELETE CASCADE,
    leave_type TEXT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE,
    reason TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.hr_leave_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    name_en TEXT,
    days_per_year INTEGER NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.hr_loans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    employee_id UUID REFERENCES public.hr_employees(id) ON DELETE CASCADE,
    amount DECIMAL(15,2) NOT NULL,
    interest_rate DECIMAL(5,2),
    start_date DATE NOT NULL,
    end_date DATE,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paid', 'defaulted')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.hr_deductions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    name_en TEXT,
    amount_type TEXT DEFAULT 'fixed' CHECK (amount_type IN ('fixed', 'percentage')),
    amount DECIMAL(10,2) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.hr_payroll_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    period_year INTEGER NOT NULL,
    period_month INTEGER NOT NULL,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'processing', 'completed', 'failed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.hr_leave_balances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    employee_id UUID REFERENCES public.hr_employees(id) ON DELETE CASCADE,
    year INTEGER NOT NULL,
    leave_type TEXT NOT NULL,
    balance_days INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.hr_penalty_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    violation_name TEXT NOT NULL,
    violation_name_en TEXT,
    violation_code TEXT NOT NULL,
    deduction_type TEXT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- INVENTORY MODULE TABLES
-- =============================================

CREATE TABLE IF NOT EXISTS public.stock_adjustments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    branch_id UUID REFERENCES public.branches(id),
    adjustment_number TEXT NOT NULL,
    adjustment_date DATE NOT NULL,
    reason TEXT,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'posted', 'cancelled')),
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.stock_adjustment_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    adjustment_id UUID NOT NULL REFERENCES public.stock_adjustments(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id),
    warehouse_id UUID REFERENCES public.warehouses(id),
    quantity DECIMAL(10,2) NOT NULL,
    unit_cost DECIMAL(10,2),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.stock_transfers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    from_branch_id UUID REFERENCES public.branches(id),
    to_branch_id UUID REFERENCES public.branches(id),
    transfer_number TEXT NOT NULL,
    transfer_date DATE NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_transit', 'completed', 'cancelled')),
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.stock_transfer_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transfer_id UUID NOT NULL REFERENCES public.stock_transfers(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id),
    quantity_sent DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.internal_consumptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    branch_id UUID REFERENCES public.branches(id),
    consumption_date DATE NOT NULL,
    reason TEXT,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'posted', 'cancelled')),
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.internal_consumption_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    consumption_id UUID NOT NULL REFERENCES public.internal_consumptions(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id),
    quantity DECIMAL(10,2) NOT NULL,
    unit_cost DECIMAL(10,2),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.bill_of_materials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    name_en TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.bom_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bill_id UUID NOT NULL REFERENCES public.bill_of_materials(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id),
    quantity DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.manufacturing_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    order_number TEXT NOT NULL,
    order_date DATE NOT NULL,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'processing', 'completed', 'cancelled')),
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.manufacturing_order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.manufacturing_orders(id) ON DELETE CASCADE,
    bill_id UUID REFERENCES public.bill_of_materials(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id),
    quantity DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- POS MODULE TABLES
-- =============================================

CREATE TABLE IF NOT EXISTS public.pos_menu_prices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    branch_id UUID REFERENCES public.branches(id),
    menu_id UUID NOT NULL REFERENCES public.products(id),
    price DECIMAL(10,2) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.pos_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    branch_id UUID REFERENCES public.branches(id),
    table_id UUID REFERENCES public.pos_tables(id),
    session_number TEXT NOT NULL,
    status TEXT DEFAULT 'open' CHECK (status IN ('open', 'closed', 'cancelled')),
    opened_by UUID REFERENCES auth.users(id),
    opened_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    closed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.pos_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    branch_id UUID REFERENCES public.branches(id),
    session_id UUID REFERENCES public.pos_sessions(id),
    transaction_number TEXT NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    payment_method_id UUID REFERENCES public.payment_methods(id),
    status TEXT DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'cancelled', 'refunded')),
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.pos_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    branch_id UUID REFERENCES public.branches(id),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    display_name TEXT NOT NULL,
    pin TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.pos_tables (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    branch_id UUID REFERENCES public.branches(id),
    table_number TEXT NOT NULL,
    capacity INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.pos_coupons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    branch_id UUID REFERENCES public.branches(id),
    code TEXT NOT NULL UNIQUE,
    discount_type TEXT DEFAULT 'percentage' CHECK (discount_type IN ('percentage', 'fixed')),
    discount_value DECIMAL(10,2) NOT NULL,
    max_uses INTEGER,
    min_order_amount DECIMAL(10,2),
    valid_from DATE,
    valid_until DATE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.pos_sales_targets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    branch_id UUID REFERENCES public.branches(id),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    period_year INTEGER NOT NULL,
    period_month INTEGER NOT NULL,
    target_amount DECIMAL(10,2) NOT NULL,
    achieved_amount DECIMAL(10,2),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.pos_promotions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    branch_id UUID REFERENCES public.branches(id),
    name TEXT NOT NULL,
    name_en TEXT,
    discount_type TEXT DEFAULT 'percentage' CHECK (discount_type IN ('percentage', 'fixed')),
    discount_value DECIMAL(10,2) NOT NULL,
    valid_from DATE,
    valid_until DATE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.pos_terminals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    branch_id UUID REFERENCES public.branches(id),
    name TEXT NOT NULL,
    terminal_code TEXT NOT NULL UNIQUE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.pos_api_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    branch_id UUID REFERENCES public.branches(id),
    order_number TEXT NOT NULL,
    order_date DATE NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'cancelled')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.pos_api_integrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    name_en TEXT,
    api_key TEXT,
    api_url TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- BRANCH ACCOUNT SETTINGS
-- =============================================

CREATE TABLE IF NOT EXISTS public.branch_account_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
    module_type TEXT NOT NULL,
    account_id UUID REFERENCES public.accounts(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- ROW LEVEL SECURITY POLICIES
-- =============================================

-- HR Tables Policies
CREATE POLICY "Company members can view HR employees" ON public.hr_employees
    FOR SELECT USING (EXISTS (
        SELECT 1 FROM public.company_members 
        WHERE company_id = hr_employees.company_id 
        AND user_id = auth.uid()
        AND is_active = true
    ));

CREATE POLICY "Company owner can manage HR employees" ON public.hr_employees
    FOR ALL USING (EXISTS (
        SELECT 1 FROM public.companies 
        WHERE id = hr_employees.company_id 
        AND owner_id = auth.uid()
    ));

-- HR Work Shifts Policies
CREATE POLICY "Company members can view HR work shifts" ON public.hr_work_shifts
    FOR SELECT USING (EXISTS (
        SELECT 1 FROM public.company_members 
        WHERE company_id = hr_work_shifts.company_id 
        AND user_id = auth.uid()
        AND is_active = true
    ));

CREATE POLICY "Company owner can manage HR work shifts" ON public.hr_work_shifts
    FOR ALL USING (EXISTS (
        SELECT 1 FROM public.companies 
        WHERE id = hr_work_shifts.company_id 
        AND owner_id = auth.uid()
    ));

-- HR Departments Policies
CREATE POLICY "Company members can view HR departments" ON public.hr_departments
    FOR SELECT USING (EXISTS (
        SELECT 1 FROM public.company_members 
        WHERE company_id = hr_departments.company_id 
        AND user_id = auth.uid()
        AND is_active = true
    ));

CREATE POLICY "Company owner can manage HR departments" ON public.hr_departments
    FOR ALL USING (EXISTS (
        SELECT 1 FROM public.companies 
        WHERE id = hr_departments.company_id 
        AND owner_id = auth.uid()
    ));

-- HR Leaves Policies
CREATE POLICY "Company members can view HR leaves" ON public.hr_leaves
    FOR SELECT USING (EXISTS (
        SELECT 1 FROM public.company_members 
        WHERE company_id = hr_leaves.company_id 
        AND user_id = auth.uid()
        AND is_active = true
    ));

CREATE POLICY "Company owner can manage HR leaves" ON public.hr_leaves
    FOR ALL USING (EXISTS (
        SELECT 1 FROM public.companies 
        WHERE id = hr_leaves.company_id 
        AND owner_id = auth.uid()
    ));

-- HR Leave Policies Policies
CREATE POLICY "Company members can view HR leave policies" ON public.hr_leave_policies
    FOR SELECT USING (EXISTS (
        SELECT 1 FROM public.company_members 
        WHERE company_id = hr_leave_policies.company_id 
        AND user_id = auth.uid()
        AND is_active = true
    ));

CREATE POLICY "Company owner can manage HR leave policies" ON public.hr_leave_policies
    FOR ALL USING (EXISTS (
        SELECT 1 FROM public.companies 
        WHERE id = hr_leave_policies.company_id 
        AND owner_id = auth.uid()
    ));

-- HR Loans Policies
CREATE POLICY "Company members can view HR loans" ON public.hr_loans
    FOR SELECT USING (EXISTS (
        SELECT 1 FROM public.company_members 
        WHERE company_id = hr_loans.company_id 
        AND user_id = auth.uid()
        AND is_active = true
    ));

CREATE POLICY "Company owner can manage HR loans" ON public.hr_loans
    FOR ALL USING (EXISTS (
        SELECT 1 FROM public.companies 
        WHERE id = hr_loans.company_id 
        AND owner_id = auth.uid()
    ));

-- HR Deductions Policies
CREATE POLICY "Company members can view HR deductions" ON public.hr_deductions
    FOR SELECT USING (EXISTS (
        SELECT 1 FROM public.company_members 
        WHERE company_id = hr_deductions.company_id 
        AND user_id = auth.uid()
        AND is_active = true
    ));

CREATE POLICY "Company owner can manage HR deductions" ON public.hr_deductions
    FOR ALL USING (EXISTS (
        SELECT 1 FROM public.companies 
        WHERE id = hr_deductions.company_id 
        AND owner_id = auth.uid()
    ));

-- HR Payroll Runs Policies
CREATE POLICY "Company members can view HR payroll runs" ON public.hr_payroll_runs
    FOR SELECT USING (EXISTS (
        SELECT 1 FROM public.company_members 
        WHERE company_id = hr_payroll_runs.company_id 
        AND user_id = auth.uid()
        AND is_active = true
    ));

CREATE POLICY "Company owner can manage HR payroll runs" ON public.hr_payroll_runs
    FOR ALL USING (EXISTS (
        SELECT 1 FROM public.companies 
        WHERE id = hr_payroll_runs.company_id 
        AND owner_id = auth.uid()
    ));

-- HR Leave Balances Policies
CREATE POLICY "Company members can view HR leave balances" ON public.hr_leave_balances
    FOR SELECT USING (EXISTS (
        SELECT 1 FROM public.company_members 
        WHERE company_id = hr_leave_balances.company_id 
        AND user_id = auth.uid()
        AND is_active = true
    ));

CREATE POLICY "Company owner can manage HR leave balances" ON public.hr_leave_balances
    FOR ALL USING (EXISTS (
        SELECT 1 FROM public.companies 
        WHERE id = hr_leave_balances.company_id 
        AND owner_id = auth.uid()
    ));

-- HR Penalty Rules Policies
CREATE POLICY "Company members can view HR penalty rules" ON public.hr_penalty_rules
    FOR SELECT USING (EXISTS (
        SELECT 1 FROM public.company_members 
        WHERE company_id = hr_penalty_rules.company_id 
        AND user_id = auth.uid()
        AND is_active = true
    ));

CREATE POLICY "Company owner can manage HR penalty rules" ON public.hr_penalty_rules
    FOR ALL USING (EXISTS (
        SELECT 1 FROM public.companies 
        WHERE id = hr_penalty_rules.company_id 
        AND owner_id = auth.uid()
    ));

-- Inventory Tables Policies
CREATE POLICY "Company members can view stock adjustments" ON public.stock_adjustments
    FOR SELECT USING (EXISTS (
        SELECT 1 FROM public.company_members 
        WHERE company_id = stock_adjustments.company_id 
        AND user_id = auth.uid()
        AND is_active = true
    ));

CREATE POLICY "Company owner can manage stock adjustments" ON public.stock_adjustments
    FOR ALL USING (EXISTS (
        SELECT 1 FROM public.companies 
        WHERE id = stock_adjustments.company_id 
        AND owner_id = auth.uid()
    ));

CREATE POLICY "Company members can view stock transfers" ON public.stock_transfers
    FOR SELECT USING (EXISTS (
        SELECT 1 FROM public.company_members 
        WHERE company_id = stock_transfers.company_id 
        AND user_id = auth.uid()
        AND is_active = true
    ));

CREATE POLICY "Company owner can manage stock transfers" ON public.stock_transfers
    FOR ALL USING (EXISTS (
        SELECT 1 FROM public.companies 
        WHERE id = stock_transfers.company_id 
        AND owner_id = auth.uid()
    ));

CREATE POLICY "Company members can view internal consumptions" ON public.internal_consumptions
    FOR SELECT USING (EXISTS (
        SELECT 1 FROM public.company_members 
        WHERE company_id = internal_consumptions.company_id 
        AND user_id = auth.uid()
        AND is_active = true
    ));

CREATE POLICY "Company owner can manage internal consumptions" ON public.internal_consumptions
    FOR ALL USING (EXISTS (
        SELECT 1 FROM public.companies 
        WHERE id = internal_consumptions.company_id 
        AND owner_id = auth.uid()
    ));

CREATE POLICY "Company members can view bill of materials" ON public.bill_of_materials
    FOR SELECT USING (EXISTS (
        SELECT 1 FROM public.company_members 
        WHERE company_id = bill_of_materials.company_id 
        AND user_id = auth.uid()
        AND is_active = true
    ));

CREATE POLICY "Company owner can manage bill of materials" ON public.bill_of_materials
    FOR ALL USING (EXISTS (
        SELECT 1 FROM public.companies 
        WHERE id = bill_of_materials.company_id 
        AND owner_id = auth.uid()
    ));

CREATE POLICY "Company members can view manufacturing orders" ON public.manufacturing_orders
    FOR SELECT USING (EXISTS (
        SELECT 1 FROM public.company_members 
        WHERE company_id = manufacturing_orders.company_id 
        AND user_id = auth.uid()
        AND is_active = true
    ));

CREATE POLICY "Company owner can manage manufacturing orders" ON public.manufacturing_orders
    FOR ALL USING (EXISTS (
        SELECT 1 FROM public.companies 
        WHERE id = manufacturing_orders.company_id 
        AND owner_id = auth.uid()
    ));

-- POS Tables Policies
CREATE POLICY "Company members can view POS menu prices" ON public.pos_menu_prices
    FOR SELECT USING (EXISTS (
        SELECT 1 FROM public.company_members 
        WHERE company_id = pos_menu_prices.company_id 
        AND user_id = auth.uid()
        AND is_active = true
    ));

CREATE POLICY "Company owner can manage POS menu prices" ON public.pos_menu_prices
    FOR ALL USING (EXISTS (
        SELECT 1 FROM public.companies 
        WHERE id = pos_menu_prices.company_id 
        AND owner_id = auth.uid()
    ));

CREATE POLICY "Company members can view POS sessions" ON public.pos_sessions
    FOR SELECT USING (EXISTS (
        SELECT 1 FROM public.company_members 
        WHERE company_id = pos_sessions.company_id 
        AND user_id = auth.uid()
        AND is_active = true
    ));

CREATE POLICY "Company owner can manage POS sessions" ON public.pos_sessions
    FOR ALL USING (EXISTS (
        SELECT 1 FROM public.companies 
        WHERE id = pos_sessions.company_id 
        AND owner_id = auth.uid()
    ));

CREATE POLICY "Company members can view POS transactions" ON public.pos_transactions
    FOR SELECT USING (EXISTS (
        SELECT 1 FROM public.company_members 
        WHERE company_id = pos_transactions.company_id 
        AND user_id = auth.uid()
        AND is_active = true
    ));

CREATE POLICY "Company owner can manage POS transactions" ON public.pos_transactions
    FOR ALL USING (EXISTS (
        SELECT 1 FROM public.companies 
        WHERE id = pos_transactions.company_id 
        AND owner_id = auth.uid()
    ));

CREATE POLICY "Company members can view POS users" ON public.pos_users
    FOR SELECT USING (EXISTS (
        SELECT 1 FROM public.company_members 
        WHERE company_id = pos_users.company_id 
        AND user_id = auth.uid()
        AND is_active = true
    ));

CREATE POLICY "Company owner can manage POS users" ON public.pos_users
    FOR ALL USING (EXISTS (
        SELECT 1 FROM public.companies 
        WHERE id = pos_users.company_id 
        AND owner_id = auth.uid()
    ));

CREATE POLICY "Company members can view POS tables" ON public.pos_tables
    FOR SELECT USING (EXISTS (
        SELECT 1 FROM public.company_members 
        WHERE company_id = pos_tables.company_id 
        AND user_id = auth.uid()
        AND is_active = true
    ));

CREATE POLICY "Company owner can manage POS tables" ON public.pos_tables
    FOR ALL USING (EXISTS (
        SELECT 1 FROM public.companies 
        WHERE id = pos_tables.company_id 
        AND owner_id = auth.uid()
    ));

CREATE POLICY "Company members can view POS coupons" ON public.pos_coupons
    FOR SELECT USING (EXISTS (
        SELECT 1 FROM public.company_members 
        WHERE company_id = pos_coupons.company_id 
        AND user_id = auth.uid()
        AND is_active = true
    ));

CREATE POLICY "Company owner can manage POS coupons" ON public.pos_coupons
    FOR ALL USING (EXISTS (
        SELECT 1 FROM public.companies 
        WHERE id = pos_coupons.company_id 
        AND owner_id = auth.uid()
    ));

CREATE POLICY "Company members can view POS sales targets" ON public.pos_sales_targets
    FOR SELECT USING (EXISTS (
        SELECT 1 FROM public.company_members 
        WHERE company_id = pos_sales_targets.company_id 
        AND user_id = auth.uid()
        AND is_active = true
    ));

CREATE POLICY "Company owner can manage POS sales targets" ON public.pos_sales_targets
    FOR ALL USING (EXISTS (
        SELECT 1 FROM public.companies 
        WHERE id = pos_sales_targets.company_id 
        AND owner_id = auth.uid()
    ));

CREATE POLICY "Company members can view POS promotions" ON public.pos_promotions
    FOR SELECT USING (EXISTS (
        SELECT 1 FROM public.company_members 
        WHERE company_id = pos_promotions.company_id 
        AND user_id = auth.uid()
        AND is_active = true
    ));

CREATE POLICY "Company owner can manage POS promotions" ON public.pos_promotions
    FOR ALL USING (EXISTS (
        SELECT 1 FROM public.companies 
        WHERE id = pos_promotions.company_id 
        AND owner_id = auth.uid()
    ));

CREATE POLICY "Company members can view POS terminals" ON public.pos_terminals
    FOR SELECT USING (EXISTS (
        SELECT 1 FROM public.company_members 
        WHERE company_id = pos_terminals.company_id 
        AND user_id = auth.uid()
        AND is_active = true
    ));

CREATE POLICY "Company owner can manage POS terminals" ON public.pos_terminals
    FOR ALL USING (EXISTS (
        SELECT 1 FROM public.companies 
        WHERE id = pos_terminals.company_id 
        AND owner_id = auth.uid()
    ));

CREATE POLICY "Company members can view POS API orders" ON public.pos_api_orders
    FOR SELECT USING (EXISTS (
        SELECT 1 FROM public.company_members 
        WHERE company_id = pos_api_orders.company_id 
        AND user_id = auth.uid()
        AND is_active = true
    ));

CREATE POLICY "Company owner can manage POS API orders" ON public.pos_api_orders
    FOR ALL USING (EXISTS (
        SELECT 1 FROM public.companies 
        WHERE id = pos_api_orders.company_id 
        AND owner_id = auth.uid()
    ));

CREATE POLICY "Company members can view POS API integrations" ON public.pos_api_integrations
    FOR SELECT USING (EXISTS (
        SELECT 1 FROM public.company_members 
        WHERE company_id = pos_api_integrations.company_id 
        AND user_id = auth.uid()
        AND is_active = true
    ));

CREATE POLICY "Company owner can manage POS API integrations" ON public.pos_api_integrations
    FOR ALL USING (EXISTS (
        SELECT 1 FROM public.companies 
        WHERE id = pos_api_integrations.company_id 
        AND owner_id = auth.uid()
    ));

-- Branch Account Settings Policies
CREATE POLICY "Company members can view branch account settings" ON public.branch_account_settings
    FOR SELECT USING (EXISTS (
        SELECT 1 FROM public.company_members 
        WHERE company_id = branch_account_settings.company_id 
        AND user_id = auth.uid()
        AND is_active = true
    ));

CREATE POLICY "Company owner can manage branch account settings" ON public.branch_account_settings
    FOR ALL USING (EXISTS (
        SELECT 1 FROM public.companies 
        WHERE id = branch_account_settings.company_id 
        AND owner_id = auth.uid()
    ));

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================

CREATE INDEX IF NOT EXISTS idx_hr_employees_company ON public.hr_employees(company_id);
CREATE INDEX IF NOT EXISTS idx_hr_employees_user ON public.hr_employees(user_id);
CREATE INDEX IF NOT EXISTS idx_hr_employees_department ON public.hr_employees(department_id);
CREATE INDEX IF NOT EXISTS idx_hr_work_shifts_company ON public.hr_work_shifts(company_id);
CREATE INDEX IF NOT EXISTS idx_hr_departments_company ON public.hr_departments(company_id);
CREATE INDEX IF NOT EXISTS idx_hr_leaves_company ON public.hr_leaves(company_id);
CREATE INDEX IF NOT EXISTS idx_hr_leaves_employee ON public.hr_leaves(employee_id);
CREATE INDEX IF NOT EXISTS idx_hr_leaves_type ON public.hr_leaves(leave_type);
CREATE INDEX IF NOT EXISTS idx_hr_leave_policies_company ON public.hr_leave_policies(company_id);
CREATE INDEX IF NOT EXISTS idx_hr_loans_company ON public.hr_loans(company_id);
CREATE INDEX IF NOT EXISTS idx_hr_loans_employee ON public.hr_loans(employee_id);
CREATE INDEX IF NOT EXISTS idx_hr_deductions_company ON public.hr_deductions(company_id);
CREATE INDEX IF NOT EXISTS idx_hr_payroll_runs_company ON public.hr_payroll_runs(company_id);
CREATE INDEX IF NOT EXISTS idx_hr_leave_balances_company ON public.hr_leave_balances(company_id);
CREATE INDEX IF NOT EXISTS idx_hr_leave_balances_employee ON public.hr_leave_balances(employee_id);
CREATE INDEX IF NOT EXISTS idx_hr_penalty_rules_company ON public.hr_penalty_rules(company_id);

CREATE INDEX IF NOT EXISTS idx_stock_adjustments_company ON public.stock_adjustments(company_id);
CREATE INDEX IF NOT EXISTS idx_stock_adjustments_branch ON public.stock_adjustments(branch_id);
CREATE INDEX IF NOT EXISTS idx_stock_adjustments_date ON public.stock_adjustments(adjustment_date);
CREATE INDEX IF NOT EXISTS idx_stock_transfers_company ON public.stock_transfers(company_id);
CREATE INDEX IF NOT EXISTS idx_stock_transfers_from_branch ON public.stock_transfers(from_branch_id);
CREATE INDEX IF NOT EXISTS idx_stock_transfers_to_branch ON public.stock_transfers(to_branch_id);
CREATE INDEX IF NOT EXISTS idx_stock_transfers_date ON public.stock_transfers(transfer_date);
CREATE INDEX IF NOT EXISTS idx_internal_consumptions_company ON public.internal_consumptions(company_id);
CREATE INDEX IF NOT EXISTS idx_internal_consumptions_branch ON public.internal_consumptions(branch_id);
CREATE INDEX IF NOT EXISTS idx_internal_consumptions_date ON public.internal_consumptions(consumption_date);
CREATE INDEX IF NOT EXISTS idx_bill_of_materials_company ON public.bill_of_materials(company_id);
CREATE INDEX IF NOT EXISTS idx_manufacturing_orders_company ON public.manufacturing_orders(company_id);
CREATE INDEX IF NOT EXISTS idx_manufacturing_orders_date ON public.manufacturing_orders(order_date);
CREATE INDEX IF NOT EXISTS idx_pos_menu_prices_company ON public.pos_menu_prices(company_id);
CREATE INDEX IF NOT EXISTS idx_pos_menu_prices_branch ON public.pos_menu_prices(branch_id);
CREATE INDEX IF NOT EXISTS idx_pos_menu_prices_menu ON public.pos_menu_prices(menu_id);
CREATE INDEX IF NOT EXISTS idx_pos_sessions_company ON public.pos_sessions(company_id);
CREATE INDEX IF NOT EXISTS idx_pos_sessions_branch ON public.pos_sessions(branch_id);
CREATE INDEX IF NOT EXISTS idx_pos_sessions_table ON public.pos_sessions(table_id);
CREATE INDEX IF NOT EXISTS idx_pos_sessions_status ON public.pos_sessions(status);
CREATE INDEX IF NOT EXISTS idx_pos_sessions_opened_at ON public.pos_sessions(opened_at);
CREATE INDEX IF NOT EXISTS idx_pos_sessions_closed_at ON public.pos_sessions(closed_at);
CREATE INDEX IF NOT EXISTS idx_pos_transactions_company ON public.pos_transactions(company_id);
CREATE INDEX IF NOT EXISTS idx_pos_transactions_branch ON public.pos_transactions(branch_id);
CREATE INDEX IF NOT EXISTS idx_pos_transactions_session ON public.pos_transactions(session_id);
CREATE INDEX IF NOT EXISTS idx_pos_transactions_date ON public.pos_transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_pos_transactions_status ON public.pos_transactions(status);
CREATE INDEX IF NOT EXISTS idx_pos_users_company ON public.pos_users(company_id);
CREATE INDEX IF NOT EXISTS idx_pos_users_branch ON public.pos_users(branch_id);
CREATE INDEX IF NOT EXISTS idx_pos_users_user ON public.pos_users(user_id);
CREATE INDEX IF NOT EXISTS idx_pos_users_display ON public.pos_users(display_name);
CREATE INDEX IF NOT EXISTS idx_pos_users_is_active ON public.pos_users(is_active);
CREATE INDEX IF NOT EXISTS idx_pos_tables_company ON public.pos_tables(company_id);
CREATE INDEX IF NOT EXISTS idx_pos_tables_branch ON public.pos_tables(branch_id);
CREATE INDEX IF NOT EXISTS idx_pos_coupons_company ON public.pos_coupons(company_id);
CREATE INDEX IF NOT EXISTS idx_pos_coupons_branch ON public.pos_coupons(branch_id);
CREATE INDEX IF NOT EXISTS idx_pos_coupons_code ON public.pos_coupons(code);
CREATE INDEX IF NOT EXISTS idx_pos_coupons_is_active ON public.pos_coupons(is_active);
CREATE INDEX IF NOT EXISTS idx_pos_sales_targets_company ON public.pos_sales_targets(company_id);
CREATE INDEX IF NOT EXISTS idx_pos_sales_targets_branch ON public.pos_sales_targets(branch_id);
CREATE INDEX IF NOT EXISTS idx_pos_sales_targets_user ON public.pos_sales_targets(user_id);
CREATE INDEX IF NOT EXISTS idx_pos_sales_targets_period ON public.pos_sales_targets(period_year, period_month);
CREATE INDEX IF NOT EXISTS idx_pos_promotions_company ON public.pos_promotions(company_id);
CREATE INDEX IF NOT EXISTS idx_pos_promotions_branch ON public.pos_promotions(branch_id);
CREATE INDEX IF NOT EXISTS idx_pos_promotions_valid_from ON public.pos_promotions(valid_from);
CREATE INDEX IF NOT EXISTS idx_pos_promotions_valid_until ON public.pos_promotions(valid_until);
CREATE INDEX IF NOT EXISTS idx_pos_promotions_is_active ON public.pos_promotions(is_active);
CREATE INDEX IF NOT EXISTS idx_pos_terminals_company ON public.pos_terminals(company_id);
CREATE INDEX IF NOT EXISTS idx_pos_terminals_branch ON public.pos_terminals(branch_id);
CREATE INDEX IF NOT EXISTS idx_pos_terminals_terminal_code ON public.pos_terminals(terminal_code);
CREATE INDEX IF NOT EXISTS idx_pos_terminals_is_active ON public.pos_terminals(is_active);
CREATE INDEX IF NOT EXISTS idx_pos_api_orders_company ON public.pos_api_orders(company_id);
CREATE INDEX IF NOT EXISTS idx_pos_api_orders_branch ON public.pos_api_orders(branch_id);
CREATE INDEX IF NOT EXISTS idx_pos_api_orders_date ON public.pos_api_orders(order_date);
CREATE INDEX IF NOT EXISTS idx_pos_api_orders_status ON public.pos_api_orders(status);
CREATE INDEX IF NOT EXISTS idx_pos_api_integrations_company ON public.pos_api_integrations(company_id);
CREATE INDEX IF NOT EXISTS idx_pos_api_integrations_is_active ON public.pos_api_integrations(is_active);
CREATE INDEX IF NOT EXISTS idx_branch_account_settings_company ON public.branch_account_settings(company_id);
CREATE INDEX IF NOT EXISTS idx_branch_account_settings_branch ON public.branch_account_settings(branch_id);
CREATE INDEX IF NOT EXISTS idx_branch_account_settings_module_type ON public.branch_account_settings(module_type);

-- =============================================
-- TRIGGERS FOR UPDATED_AT COLUMNS
-- =============================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers to all tables that need updated_at
CREATE TRIGGER update_hr_employees_updated_at BEFORE UPDATE ON public.hr_employees
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_hr_work_shifts_updated_at BEFORE UPDATE ON public.hr_work_shifts
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_hr_departments_updated_at BEFORE UPDATE ON public.hr_departments
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_hr_leaves_updated_at BEFORE UPDATE ON public.hr_leaves
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_hr_leave_policies_updated_at BEFORE UPDATE ON public.hr_leave_policies
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_hr_loans_updated_at BEFORE UPDATE ON public.hr_loans
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_hr_deductions_updated_at BEFORE UPDATE ON public.hr_deductions
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_hr_payroll_runs_updated_at BEFORE UPDATE ON public.hr_payroll_runs
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_hr_leave_balances_updated_at BEFORE UPDATE ON public.hr_leave_balances
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_hr_penalty_rules_updated_at BEFORE UPDATE ON public.hr_penalty_rules
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_stock_adjustments_updated_at BEFORE UPDATE ON public.stock_adjustments
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_stock_transfers_updated_at BEFORE UPDATE ON public.stock_transfers
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_internal_consumptions_updated_at BEFORE UPDATE ON public.internal_consumptions
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_manufacturing_orders_updated_at BEFORE UPDATE ON public.manufacturing_orders
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_pos_menu_prices_updated_at BEFORE UPDATE ON public.pos_menu_prices
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_pos_sessions_updated_at BEFORE UPDATE ON public.pos_sessions
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_pos_transactions_updated_at BEFORE UPDATE ON public.pos_transactions
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_pos_users_updated_at BEFORE UPDATE ON public.pos_users
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_pos_tables_updated_at BEFORE UPDATE ON public.pos_tables
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_pos_coupons_updated_at BEFORE UPDATE ON public.pos_coupons
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_pos_sales_targets_updated_at BEFORE UPDATE ON public.pos_sales_targets
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_pos_promotions_updated_at BEFORE UPDATE ON public.pos_promotions
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_pos_terminals_updated_at BEFORE UPDATE ON public.pos_terminals
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_pos_api_orders_updated_at BEFORE UPDATE ON public.pos_api_orders
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_pos_api_integrations_updated_at BEFORE UPDATE ON public.pos_api_integrations
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_branch_account_settings_updated_at BEFORE UPDATE ON public.branch_account_settings
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- MIGRATION COMPLETE
-- =============================================
