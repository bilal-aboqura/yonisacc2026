-- =============================================
-- MIGRATION: Fix All Missing Tables (Comprehensive Fix)
-- =============================================
-- This migration creates ALL missing tables in the correct order
-- to resolve all 404 errors in the application.

-- Enable extension for UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================
-- 1. COMPANIES TABLE (Core table - must exist first)
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

-- Simple policy for companies (will be updated by other migrations)
CREATE POLICY IF NOT EXISTS "Users can view their companies" ON public.companies
    FOR SELECT USING (owner_id = auth.uid());

CREATE POLICY IF NOT EXISTS "Owners can manage their companies" ON public.companies
    FOR ALL USING (owner_id = auth.uid());

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_companies_owner_id ON public.companies(owner_id);

-- =============================================
-- 2. COMPANY_MEMBERS TABLE (Team members)
-- =============================================

CREATE TABLE IF NOT EXISTS public.company_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'client',
    is_active BOOLEAN NOT NULL DEFAULT true,
    invited_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (company_id, user_id)
);

ALTER TABLE public.company_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Company owner can manage members" ON public.company_members
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.companies WHERE id = company_id AND owner_id = auth.uid())
    );

CREATE POLICY IF NOT EXISTS "Members can view own membership" ON public.company_members
    FOR SELECT USING (user_id = auth.uid());

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_company_members_company_id ON public.company_members(company_id);
CREATE INDEX IF NOT EXISTS idx_company_members_user_id ON public.company_members(user_id);

-- =============================================
-- 3. BRANCH_ACCOUNT_SETTINGS TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS public.branch_account_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
    default_cash_account_id UUID REFERENCES public.accounts(id),
    default_bank_account_id UUID REFERENCES public.accounts(id),
    default_discount_account_id UUID REFERENCES public.accounts(id),
    default_sales_account_id UUID REFERENCES public.accounts(id),
    default_purchase_account_id UUID REFERENCES public.accounts(id),
    default_cost_account_id UUID REFERENCES public.accounts(id),
    default_sales_return_account_id UUID REFERENCES public.accounts(id),
    default_purchase_return_account_id UUID REFERENCES public.accounts(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (company_id, branch_id)
);

ALTER TABLE public.branch_account_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Company members can view branch account settings" ON public.branch_account_settings
    FOR SELECT USING (company_id IN (
        SELECT id FROM public.companies WHERE owner_id = auth.uid()
        UNION
        SELECT company_id FROM public.company_members WHERE user_id = auth.uid() AND is_active = true
    ));

CREATE POLICY IF NOT EXISTS "Company owner can manage branch account settings" ON public.branch_account_settings
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.companies WHERE id = company_id AND owner_id = auth.uid())
    );

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_branch_account_settings_company_id ON public.branch_account_settings(company_id);
CREATE INDEX IF NOT EXISTS idx_branch_account_settings_branch_id ON public.branch_account_settings(branch_id);

-- =============================================
-- 4. HR MODULE TABLES
-- =============================================

-- HR: Departments
CREATE TABLE IF NOT EXISTS public.hr_departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    name_en TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.hr_departments ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Company members can view departments" ON public.hr_departments
    FOR SELECT USING (company_id IN (
        SELECT id FROM public.companies WHERE owner_id = auth.uid()
        UNION
        SELECT company_id FROM public.company_members WHERE user_id = auth.uid() AND is_active = true
    ));

CREATE POLICY IF NOT EXISTS "Company members can manage departments" ON public.hr_departments
    FOR ALL USING (company_id IN (
        SELECT id FROM public.companies WHERE owner_id = auth.uid()
        UNION
        SELECT company_id FROM public.company_members WHERE user_id = auth.uid() AND is_active = true
    ));

CREATE INDEX IF NOT EXISTS idx_hr_departments_company_id ON public.hr_departments(company_id);

-- HR: Work Shifts
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

ALTER TABLE public.hr_work_shifts ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Company members can view work shifts" ON public.hr_work_shifts
    FOR SELECT USING (company_id IN (
        SELECT id FROM public.companies WHERE owner_id = auth.uid()
        UNION
        SELECT company_id FROM public.company_members WHERE user_id = auth.uid() AND is_active = true
    ));

CREATE POLICY IF NOT EXISTS "Company members can manage work shifts" ON public.hr_work_shifts
    FOR ALL USING (company_id IN (
        SELECT id FROM public.companies WHERE owner_id = auth.uid()
        UNION
        SELECT company_id FROM public.company_members WHERE user_id = auth.uid() AND is_active = true
    ));

CREATE INDEX IF NOT EXISTS idx_hr_work_shifts_company_id ON public.hr_work_shifts(company_id);

-- HR: Employees
CREATE TABLE IF NOT EXISTS public.hr_employees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    name_en TEXT,
    employee_number TEXT UNIQUE,
    national_id TEXT,
    job_title TEXT,
    department_id UUID REFERENCES public.hr_departments(id) ON DELETE SET NULL,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'terminated')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.hr_employees ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Company members can view employees" ON public.hr_employees
    FOR SELECT USING (company_id IN (
        SELECT id FROM public.companies WHERE owner_id = auth.uid()
        UNION
        SELECT company_id FROM public.company_members WHERE user_id = auth.uid() AND is_active = true
    ));

CREATE POLICY IF NOT EXISTS "Company members can manage employees" ON public.hr_employees
    FOR ALL USING (company_id IN (
        SELECT id FROM public.companies WHERE owner_id = auth.uid()
        UNION
        SELECT company_id FROM public.company_members WHERE user_id = auth.uid() AND is_active = true
    ));

CREATE INDEX IF NOT EXISTS idx_hr_employees_company_id ON public.hr_employees(company_id);
CREATE INDEX IF NOT EXISTS idx_hr_employees_user_id ON public.hr_employees(user_id);
CREATE INDEX IF NOT EXISTS idx_hr_employees_department_id ON public.hr_employees(department_id);

-- HR: Leaves
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
    approved_by UUID REFERENCES auth.users(id),
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.hr_leaves ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Company members can view leaves" ON public.hr_leaves
    FOR SELECT USING (company_id IN (
        SELECT id FROM public.companies WHERE owner_id = auth.uid()
        UNION
        SELECT company_id FROM public.company_members WHERE user_id = auth.uid() AND is_active = true
    ));

CREATE POLICY IF NOT EXISTS "Company members can manage leaves" ON public.hr_leaves
    FOR ALL USING (company_id IN (
        SELECT id FROM public.companies WHERE owner_id = auth.uid()
        UNION
        SELECT company_id FROM public.company_members WHERE user_id = auth.uid() AND is_active = true
    ));

CREATE INDEX IF NOT EXISTS idx_hr_leaves_company_id ON public.hr_leaves(company_id);
CREATE INDEX IF NOT EXISTS idx_hr_leaves_user_id ON public.hr_leaves(user_id);
CREATE INDEX IF NOT EXISTS idx_hr_leaves_employee_id ON public.hr_leaves(employee_id);

-- HR: Leave Policies
CREATE TABLE IF NOT EXISTS public.hr_leave_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    name_en TEXT,
    leave_type TEXT NOT NULL,
    days_per_year INTEGER NOT NULL DEFAULT 30,
    max_carry_over_days INTEGER DEFAULT 0,
    requires_approval BOOLEAN DEFAULT true,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.hr_leave_policies ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Company members can view leave policies" ON public.hr_leave_policies
    FOR SELECT USING (company_id IN (
        SELECT id FROM public.companies WHERE owner_id = auth.uid()
        UNION
        SELECT company_id FROM public.company_members WHERE user_id = auth.uid() AND is_active = true
    ));

CREATE POLICY IF NOT EXISTS "Company members can manage leave policies" ON public.hr_leave_policies
    FOR ALL USING (company_id IN (
        SELECT id FROM public.companies WHERE owner_id = auth.uid()
        UNION
        SELECT company_id FROM public.company_members WHERE user_id = auth.uid() AND is_active = true
    ));

CREATE INDEX IF NOT EXISTS idx_hr_leave_policies_company_id ON public.hr_leave_policies(company_id);

-- HR: Leave Balances
CREATE TABLE IF NOT EXISTS public.hr_leave_balances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES public.hr_employees(id) ON DELETE CASCADE,
    leave_type TEXT NOT NULL,
    year INTEGER NOT NULL,
    total_days INTEGER NOT NULL DEFAULT 0,
    used_days INTEGER NOT NULL DEFAULT 0,
    remaining_days INTEGER GENERATED ALWAYS AS (total_days - used_days) STORED,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (employee_id, leave_type, year)
);

ALTER TABLE public.hr_leave_balances ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Company members can view leave balances" ON public.hr_leave_balances
    FOR SELECT USING (company_id IN (
        SELECT id FROM public.companies WHERE owner_id = auth.uid()
        UNION
        SELECT company_id FROM public.company_members WHERE user_id = auth.uid() AND is_active = true
    ));

CREATE POLICY IF NOT EXISTS "Company members can manage leave balances" ON public.hr_leave_balances
    FOR ALL USING (company_id IN (
        SELECT id FROM public.companies WHERE owner_id = auth.uid()
        UNION
        SELECT company_id FROM public.company_members WHERE user_id = auth.uid() AND is_active = true
    ));

CREATE INDEX IF NOT EXISTS idx_hr_leave_balances_company_id ON public.hr_leave_balances(company_id);
CREATE INDEX IF NOT EXISTS idx_hr_leave_balances_employee_id ON public.hr_leave_balances(employee_id);

-- HR: Loans
CREATE TABLE IF NOT EXISTS public.hr_loans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES public.hr_employees(id) ON DELETE CASCADE,
    amount NUMERIC(15, 2) NOT NULL,
    interest_rate NUMERIC(5, 2) DEFAULT 0,
    monthly_installment NUMERIC(15, 2) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
    paid_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
    remaining_amount NUMERIC(15, 2) GENERATED ALWAYS AS (amount - paid_amount) STORED,
    reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.hr_loans ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Company members can view loans" ON public.hr_loans
    FOR SELECT USING (company_id IN (
        SELECT id FROM public.companies WHERE owner_id = auth.uid()
        UNION
        SELECT company_id FROM public.company_members WHERE user_id = auth.uid() AND is_active = true
    ));

CREATE POLICY IF NOT EXISTS "Company members can manage loans" ON public.hr_loans
    FOR ALL USING (company_id IN (
        SELECT id FROM public.companies WHERE owner_id = auth.uid()
        UNION
        SELECT company_id FROM public.company_members WHERE user_id = auth.uid() AND is_active = true
    ));

CREATE INDEX IF NOT EXISTS idx_hr_loans_company_id ON public.hr_loans(company_id);
CREATE INDEX IF NOT EXISTS idx_hr_loans_employee_id ON public.hr_loans(employee_id);

-- HR: Deductions
CREATE TABLE IF NOT EXISTS public.hr_deductions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    name_en TEXT,
    type TEXT NOT NULL CHECK (type IN ('fixed', 'percentage')),
    amount NUMERIC(15, 2) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.hr_deductions ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Company members can view deductions" ON public.hr_deductions
    FOR SELECT USING (company_id IN (
        SELECT id FROM public.companies WHERE owner_id = auth.uid()
        UNION
        SELECT company_id FROM public.company_members WHERE user_id = auth.uid() AND is_active = true
    ));

CREATE POLICY IF NOT EXISTS "Company members can manage deductions" ON public.hr_deductions
    FOR ALL USING (company_id IN (
        SELECT id FROM public.companies WHERE owner_id = auth.uid()
        UNION
        SELECT company_id FROM public.company_members WHERE user_id = auth.uid() AND is_active = true
    ));

CREATE INDEX IF NOT EXISTS idx_hr_deductions_company_id ON public.hr_deductions(company_id);

-- HR: Payroll Runs
CREATE TABLE IF NOT EXISTS public.hr_payroll_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'processing', 'completed', 'cancelled')),
    total_employees INTEGER DEFAULT 0,
    total_gross_pay NUMERIC(15, 2) DEFAULT 0,
    total_net_pay NUMERIC(15, 2) DEFAULT 0,
    total_deductions NUMERIC(15, 2) DEFAULT 0,
    processed_by UUID REFERENCES auth.users(id),
    processed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.hr_payroll_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Company members can view payroll runs" ON public.hr_payroll_runs
    FOR SELECT USING (company_id IN (
        SELECT id FROM public.companies WHERE owner_id = auth.uid()
        UNION
        SELECT company_id FROM public.company_members WHERE user_id = auth.uid() AND is_active = true
    ));

CREATE POLICY IF NOT EXISTS "Company members can manage payroll runs" ON public.hr_payroll_runs
    FOR ALL USING (company_id IN (
        SELECT id FROM public.companies WHERE owner_id = auth.uid()
        UNION
        SELECT company_id FROM public.company_members WHERE user_id = auth.uid() AND is_active = true
    ));

CREATE INDEX IF NOT EXISTS idx_hr_payroll_runs_company_id ON public.hr_payroll_runs(company_id);

-- HR: Penalty Rules
CREATE TABLE IF NOT EXISTS public.hr_penalty_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    name_en TEXT,
    violation_type TEXT NOT NULL,
    penalty_type TEXT NOT NULL CHECK (penalty_type IN ('warning', 'deduction', 'suspension')),
    deduction_amount NUMERIC(15, 2),
    deduction_percentage NUMERIC(5, 2),
    suspension_days INTEGER,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.hr_penalty_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Company members can view penalty rules" ON public.hr_penalty_rules
    FOR SELECT USING (company_id IN (
        SELECT id FROM public.companies WHERE owner_id = auth.uid()
        UNION
        SELECT company_id FROM public.company_members WHERE user_id = auth.uid() AND is_active = true
    ));

CREATE POLICY IF NOT EXISTS "Company members can manage penalty rules" ON public.hr_penalty_rules
    FOR ALL USING (company_id IN (
        SELECT id FROM public.companies WHERE owner_id = auth.uid()
        UNION
        SELECT company_id FROM public.company_members WHERE user_id = auth.uid() AND is_active = true
    ));

CREATE INDEX IF NOT EXISTS idx_hr_penalty_rules_company_id ON public.hr_penalty_rules(company_id);

-- =============================================
-- 5. INVENTORY MODULE TABLES
-- =============================================

-- Stock Adjustments
CREATE TABLE IF NOT EXISTS public.stock_adjustments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    branch_id UUID REFERENCES public.branches(id) ON DELETE CASCADE,
    warehouse_id UUID REFERENCES public.warehouses(id) ON DELETE CASCADE,
    adjustment_number TEXT UNIQUE NOT NULL,
    adjustment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    reason TEXT NOT NULL,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'rejected', 'cancelled')),
    approved_by UUID REFERENCES auth.users(id),
    approved_at TIMESTAMPTZ,
    created_by UUID NOT NULL REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.stock_adjustments ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Company members can view stock adjustments" ON public.stock_adjustments
    FOR SELECT USING (company_id IN (
        SELECT id FROM public.companies WHERE owner_id = auth.uid()
        UNION
        SELECT company_id FROM public.company_members WHERE user_id = auth.uid() AND is_active = true
    ));

CREATE POLICY IF NOT EXISTS "Company members can manage stock adjustments" ON public.stock_adjustments
    FOR ALL USING (company_id IN (
        SELECT id FROM public.companies WHERE owner_id = auth.uid()
        UNION
        SELECT company_id FROM public.company_members WHERE user_id = auth.uid() AND is_active = true
    ));

CREATE INDEX IF NOT EXISTS idx_stock_adjustments_company_id ON public.stock_adjustments(company_id);
CREATE INDEX IF NOT EXISTS idx_stock_adjustments_branch_id ON public.stock_adjustments(branch_id);
CREATE INDEX IF NOT EXISTS idx_stock_adjustments_warehouse_id ON public.stock_adjustments(warehouse_id);

-- Stock Transfers
CREATE TABLE IF NOT EXISTS public.stock_transfers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    transfer_number TEXT UNIQUE NOT NULL,
    transfer_date DATE NOT NULL DEFAULT CURRENT_DATE,
    from_branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
    to_branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
    from_warehouse_id UUID REFERENCES public.warehouses(id) ON DELETE CASCADE,
    to_warehouse_id UUID REFERENCES public.warehouses(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_transit', 'completed', 'cancelled')),
    notes TEXT,
    created_by UUID NOT NULL REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.stock_transfers ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Company members can view stock transfers" ON public.stock_transfers
    FOR SELECT USING (company_id IN (
        SELECT id FROM public.companies WHERE owner_id = auth.uid()
        UNION
        SELECT company_id FROM public.company_members WHERE user_id = auth.uid() AND is_active = true
    ));

CREATE POLICY IF NOT EXISTS "Company members can manage stock transfers" ON public.stock_transfers
    FOR ALL USING (company_id IN (
        SELECT id FROM public.companies WHERE owner_id = auth.uid()
        UNION
        SELECT company_id FROM public.company_members WHERE user_id = auth.uid() AND is_active = true
    ));

CREATE INDEX IF NOT EXISTS idx_stock_transfers_company_id ON public.stock_transfers(company_id);
CREATE INDEX IF NOT EXISTS idx_stock_transfers_from_branch_id ON public.stock_transfers(from_branch_id);
CREATE INDEX IF NOT EXISTS idx_stock_transfers_to_branch_id ON public.stock_transfers(to_branch_id);

-- Internal Consumptions
CREATE TABLE IF NOT EXISTS public.internal_consumptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    branch_id UUID REFERENCES public.branches(id) ON DELETE CASCADE,
    warehouse_id UUID REFERENCES public.warehouses(id) ON DELETE CASCADE,
    consumption_number TEXT UNIQUE NOT NULL,
    consumption_date DATE NOT NULL DEFAULT CURRENT_DATE,
    reason TEXT NOT NULL,
    department TEXT,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'rejected', 'cancelled')),
    approved_by UUID REFERENCES auth.users(id),
    approved_at TIMESTAMPTZ,
    created_by UUID NOT NULL REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.internal_consumptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Company members can view internal consumptions" ON public.internal_consumptions
    FOR SELECT USING (company_id IN (
        SELECT id FROM public.companies WHERE owner_id = auth.uid()
        UNION
        SELECT company_id FROM public.company_members WHERE user_id = auth.uid() AND is_active = true
    ));

CREATE POLICY IF NOT EXISTS "Company members can manage internal consumptions" ON public.internal_consumptions
    FOR ALL USING (company_id IN (
        SELECT id FROM public.companies WHERE owner_id = auth.uid()
        UNION
        SELECT company_id FROM public.company_members WHERE user_id = auth.uid() AND is_active = true
    ));

CREATE INDEX IF NOT EXISTS idx_internal_consumptions_company_id ON public.internal_consumptions(company_id);
CREATE INDEX IF NOT EXISTS idx_internal_consumptions_branch_id ON public.internal_consumptions(branch_id);
CREATE INDEX IF NOT EXISTS idx_internal_consumptions_warehouse_id ON public.internal_consumptions(warehouse_id);

-- Bill of Materials
CREATE TABLE IF NOT EXISTS public.bill_of_materials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    name_en TEXT,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    quantity NUMERIC(15, 2) NOT NULL DEFAULT 1,
    unit_id UUID REFERENCES public.units(id),
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    notes TEXT,
    created_by UUID NOT NULL REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.bill_of_materials ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Company members can view bill of materials" ON public.bill_of_materials
    FOR SELECT USING (company_id IN (
        SELECT id FROM public.companies WHERE owner_id = auth.uid()
        UNION
        SELECT company_id FROM public.company_members WHERE user_id = auth.uid() AND is_active = true
    ));

CREATE POLICY IF NOT EXISTS "Company members can manage bill of materials" ON public.bill_of_materials
    FOR ALL USING (company_id IN (
        SELECT id FROM public.companies WHERE owner_id = auth.uid()
        UNION
        SELECT company_id FROM public.company_members WHERE user_id = auth.uid() AND is_active = true
    ));

CREATE INDEX IF NOT EXISTS idx_bill_of_materials_company_id ON public.bill_of_materials(company_id);
CREATE INDEX IF NOT EXISTS idx_bill_of_materials_product_id ON public.bill_of_materials(product_id);

-- Manufacturing Orders
CREATE TABLE IF NOT EXISTS public.manufacturing_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    order_number TEXT UNIQUE NOT NULL,
    order_date DATE NOT NULL DEFAULT CURRENT_DATE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    quantity NUMERIC(15, 2) NOT NULL,
    unit_id UUID REFERENCES public.units(id),
    branch_id UUID REFERENCES public.branches(id) ON DELETE CASCADE,
    warehouse_id UUID REFERENCES public.warehouses(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
    start_date DATE,
    expected_completion_date DATE,
    actual_completion_date DATE,
    notes TEXT,
    created_by UUID NOT NULL REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.manufacturing_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Company members can view manufacturing orders" ON public.manufacturing_orders
    FOR SELECT USING (company_id IN (
        SELECT id FROM public.companies WHERE owner_id = auth.uid()
        UNION
        SELECT company_id FROM public.company_members WHERE user_id = auth.uid() AND is_active = true
    ));

CREATE POLICY IF NOT EXISTS "Company members can manage manufacturing orders" ON public.manufacturing_orders
    FOR ALL USING (company_id IN (
        SELECT id FROM public.companies WHERE owner_id = auth.uid()
        UNION
        SELECT company_id FROM public.company_members WHERE user_id = auth.uid() AND is_active = true
    ));

CREATE INDEX IF NOT EXISTS idx_manufacturing_orders_company_id ON public.manufacturing_orders(company_id);
CREATE INDEX IF NOT EXISTS idx_manufacturing_orders_product_id ON public.manufacturing_orders(product_id);
CREATE INDEX IF NOT EXISTS idx_manufacturing_orders_branch_id ON public.manufacturing_orders(branch_id);

-- Manufacturing Order Items
CREATE TABLE IF NOT EXISTS public.manufacturing_order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    manufacturing_order_id UUID NOT NULL REFERENCES public.manufacturing_orders(id) ON DELETE CASCADE,
    material_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    required_quantity NUMERIC(15, 2) NOT NULL,
    unit_id UUID REFERENCES public.units(id),
    consumed_quantity NUMERIC(15, 2) DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.manufacturing_order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Company members can view manufacturing order items" ON public.manufacturing_order_items
    FOR SELECT USING (EXISTS (
        SELECT 1 FROM public.manufacturing_orders mo
        WHERE mo.id = manufacturing_order_id
        AND mo.company_id IN (
            SELECT id FROM public.companies WHERE owner_id = auth.uid()
            UNION
            SELECT company_id FROM public.company_members WHERE user_id = auth.uid() AND is_active = true
        )
    ));

CREATE POLICY IF NOT EXISTS "Company members can manage manufacturing order items" ON public.manufacturing_order_items
    FOR ALL USING (EXISTS (
        SELECT 1 FROM public.manufacturing_orders mo
        WHERE mo.id = manufacturing_order_id
        AND mo.company_id IN (
            SELECT id FROM public.companies WHERE owner_id = auth.uid()
            UNION
            SELECT company_id FROM public.company_members WHERE user_id = auth.uid() AND is_active = true
        )
    ));

CREATE INDEX IF NOT EXISTS idx_manufacturing_order_items_order_id ON public.manufacturing_order_items(manufacturing_order_id);
CREATE INDEX IF NOT EXISTS idx_manufacturing_order_items_material_id ON public.manufacturing_order_items(material_id);

-- =============================================
-- 6. POS MODULE TABLES
-- =============================================

-- POS Menu Prices
CREATE TABLE IF NOT EXISTS public.pos_menu_prices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    branch_id UUID REFERENCES public.branches(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    price NUMERIC(15, 2) NOT NULL,
    currency TEXT DEFAULT 'SAR',
    is_active BOOLEAN DEFAULT true,
    effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
    end_date DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (company_id, branch_id, product_id, effective_date)
);

ALTER TABLE public.pos_menu_prices ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Company members can view POS menu prices" ON public.pos_menu_prices
    FOR SELECT USING (company_id IN (
        SELECT id FROM public.companies WHERE owner_id = auth.uid()
        UNION
        SELECT company_id FROM public.company_members WHERE user_id = auth.uid() AND is_active = true
    ));

CREATE POLICY IF NOT EXISTS "Company members can manage POS menu prices" ON public.pos_menu_prices
    FOR ALL USING (company_id IN (
        SELECT id FROM public.companies WHERE owner_id = auth.uid()
        UNION
        SELECT company_id FROM public.company_members WHERE user_id = auth.uid() AND is_active = true
    ));

CREATE INDEX IF NOT EXISTS idx_pos_menu_prices_company_id ON public.pos_menu_prices(company_id);
CREATE INDEX IF NOT EXISTS idx_pos_menu_prices_branch_id ON public.pos_menu_prices(branch_id);
CREATE INDEX IF NOT EXISTS idx_pos_menu_prices_product_id ON public.pos_menu_prices(product_id);

-- POS Sessions
CREATE TABLE IF NOT EXISTS public.pos_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
    terminal_id UUID REFERENCES public.pos_terminals(id) ON DELETE CASCADE,
    session_number TEXT UNIQUE NOT NULL,
    opened_by UUID NOT NULL REFERENCES auth.users(id),
    opened_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    closed_by UUID REFERENCES auth.users(id),
    closed_at TIMESTAMPTZ,
    opening_balance NUMERIC(15, 2) NOT NULL DEFAULT 0,
    closing_balance NUMERIC(15, 2),
    status TEXT DEFAULT 'open' CHECK (status IN ('open', 'closed', 'cancelled')),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.pos_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Company members can view POS sessions" ON public.pos_sessions
    FOR SELECT USING (company_id IN (
        SELECT id FROM public.companies WHERE owner_id = auth.uid()
        UNION
        SELECT company_id FROM public.company_members WHERE user_id = auth.uid() AND is_active = true
    ));

CREATE POLICY IF NOT EXISTS "Company members can manage POS sessions" ON public.pos_sessions
    FOR ALL USING (company_id IN (
        SELECT id FROM public.companies WHERE owner_id = auth.uid()
        UNION
        SELECT company_id FROM public.company_members WHERE user_id = auth.uid() AND is_active = true
    ));

CREATE INDEX IF NOT EXISTS idx_pos_sessions_company_id ON public.pos_sessions(company_id);
CREATE INDEX IF NOT EXISTS idx_pos_sessions_branch_id ON public.pos_sessions(branch_id);
CREATE INDEX IF NOT EXISTS idx_pos_sessions_terminal_id ON public.pos_sessions(terminal_id);

-- POS Transactions
CREATE TABLE IF NOT EXISTS public.pos_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
    session_id UUID NOT NULL REFERENCES public.pos_sessions(id) ON DELETE CASCADE,
    transaction_number TEXT UNIQUE NOT NULL,
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('sale', 'refund', 'void')),
    transaction_date TIMESTAMPTZ NOT NULL DEFAULT now(),
    total_amount NUMERIC(15, 2) NOT NULL,
    discount_amount NUMERIC(15, 2) DEFAULT 0,
    tax_amount NUMERIC(15, 2) DEFAULT 0,
    net_amount NUMERIC(15, 2) NOT NULL,
    payment_method TEXT NOT NULL,
    payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'refunded', 'cancelled')),
    customer_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
    cashier_id UUID NOT NULL REFERENCES auth.users(id),
    status TEXT DEFAULT 'completed' CHECK (status IN ('draft', 'completed', 'cancelled')),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.pos_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Company members can view POS transactions" ON public.pos_transactions
    FOR SELECT USING (company_id IN (
        SELECT id FROM public.companies WHERE owner_id = auth.uid()
        UNION
        SELECT company_id FROM public.company_members WHERE user_id = auth.uid() AND is_active = true
    ));

CREATE POLICY IF NOT EXISTS "Company members can manage POS transactions" ON public.pos_transactions
    FOR ALL USING (company_id IN (
        SELECT id FROM public.companies WHERE owner_id = auth.uid()
        UNION
        SELECT company_id FROM public.company_members WHERE user_id = auth.uid() AND is_active = true
    ));

CREATE INDEX IF NOT EXISTS idx_pos_transactions_company_id ON public.pos_transactions(company_id);
CREATE INDEX IF NOT EXISTS idx_pos_transactions_branch_id ON public.pos_transactions(branch_id);
CREATE INDEX IF NOT EXISTS idx_pos_transactions_session_id ON public.pos_transactions(session_id);
CREATE INDEX IF NOT EXISTS idx_pos_transactions_customer_id ON public.pos_transactions(customer_id);

-- POS Users
CREATE TABLE IF NOT EXISTS public.pos_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    branch_id UUID REFERENCES public.branches(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    pin TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'cashier' CHECK (role IN ('cashier', 'manager', 'supervisor')),
    is_active BOOLEAN DEFAULT true,
    allowed_terminals TEXT[],
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (company_id, user_id)
);

ALTER TABLE public.pos_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Company members can view POS users" ON public.pos_users
    FOR SELECT USING (company_id IN (
        SELECT id FROM public.companies WHERE owner_id = auth.uid()
        UNION
        SELECT company_id FROM public.company_members WHERE user_id = auth.uid() AND is_active = true
    ));

CREATE POLICY IF NOT EXISTS "Company members can manage POS users" ON public.pos_users
    FOR ALL USING (company_id IN (
        SELECT id FROM public.companies WHERE owner_id = auth.uid()
        UNION
        SELECT company_id FROM public.company_members WHERE user_id = auth.uid() AND is_active = true
    ));

CREATE INDEX IF NOT EXISTS idx_pos_users_company_id ON public.pos_users(company_id);
CREATE INDEX IF NOT EXISTS idx_pos_users_branch_id ON public.pos_users(branch_id);
CREATE INDEX IF NOT EXISTS idx_pos_users_user_id ON public.pos_users(user_id);

-- POS Tables
CREATE TABLE IF NOT EXISTS public.pos_tables (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
    table_number TEXT NOT NULL,
    name TEXT,
    capacity INTEGER DEFAULT 4,
    status TEXT DEFAULT 'available' CHECK (status IN ('available', 'occupied', 'reserved', 'cleaning')),
    area TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (company_id, branch_id, table_number)
);

ALTER TABLE public.pos_tables ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Company members can view POS tables" ON public.pos_tables
    FOR SELECT USING (company_id IN (
        SELECT id FROM public.companies WHERE owner_id = auth.uid()
        UNION
        SELECT company_id FROM public.company_members WHERE user_id = auth.uid() AND is_active = true
    ));

CREATE POLICY IF NOT EXISTS "Company members can manage POS tables" ON public.pos_tables
    FOR ALL USING (company_id IN (
        SELECT id FROM public.companies WHERE owner_id = auth.uid()
        UNION
        SELECT company_id FROM public.company_members WHERE user_id = auth.uid() AND is_active = true
    ));

CREATE INDEX IF NOT EXISTS idx_pos_tables_company_id ON public.pos_tables(company_id);
CREATE INDEX IF NOT EXISTS idx_pos_tables_branch_id ON public.pos_tables(branch_id);

-- POS Coupons
CREATE TABLE IF NOT EXISTS public.pos_coupons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    code TEXT NOT NULL UNIQUE,
    name TEXT,
    description TEXT,
    discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
    discount_value NUMERIC(15, 2) NOT NULL,
    min_order_amount NUMERIC(15, 2) DEFAULT 0,
    max_discount_amount NUMERIC(15, 2),
    usage_limit INTEGER,
    usage_count INTEGER DEFAULT 0,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_active BOOLEAN DEFAULT true,
    applicable_products TEXT[],
    applicable_categories TEXT[],
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.pos_coupons ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Company members can view POS coupons" ON public.pos_coupons
    FOR SELECT USING (company_id IN (
        SELECT id FROM public.companies WHERE owner_id = auth.uid()
        UNION
        SELECT company_id FROM public.company_members WHERE user_id = auth.uid() AND is_active = true
    ));

CREATE POLICY IF NOT EXISTS "Company members can manage POS coupons" ON public.pos_coupons
    FOR ALL USING (company_id IN (
        SELECT id FROM public.companies WHERE owner_id = auth.uid()
        UNION
        SELECT company_id FROM public.company_members WHERE user_id = auth.uid() AND is_active = true
    ));

CREATE INDEX IF NOT EXISTS idx_pos_coupons_company_id ON public.pos_coupons(company_id);

-- POS Sales Targets
CREATE TABLE IF NOT EXISTS public.pos_sales_targets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    branch_id UUID REFERENCES public.branches(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    period TEXT NOT NULL CHECK (period IN ('daily', 'weekly', 'monthly', 'quarterly', 'yearly')),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    target_amount NUMERIC(15, 2) NOT NULL,
    achieved_amount NUMERIC(15, 2) DEFAULT 0,
    achievement_percentage NUMERIC(5, 2) GENERATED ALWAYS AS (
        CASE WHEN target_amount > 0 THEN (achieved_amount / target_amount) * 100 ELSE 0 END
    ) STORED,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.pos_sales_targets ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Company members can view POS sales targets" ON public.pos_sales_targets
    FOR SELECT USING (company_id IN (
        SELECT id FROM public.companies WHERE owner_id = auth.uid()
        UNION
        SELECT company_id FROM public.company_members WHERE user_id = auth.uid() AND is_active = true
    ));

CREATE POLICY IF NOT EXISTS "Company members can manage POS sales targets" ON public.pos_sales_targets
    FOR ALL USING (company_id IN (
        SELECT id FROM public.companies WHERE owner_id = auth.uid()
        UNION
        SELECT company_id FROM public.company_members WHERE user_id = auth.uid() AND is_active = true
    ));

CREATE INDEX IF NOT EXISTS idx_pos_sales_targets_company_id ON public.pos_sales_targets(company_id);
CREATE INDEX IF NOT EXISTS idx_pos_sales_targets_branch_id ON public.pos_sales_targets(branch_id);
CREATE INDEX IF NOT EXISTS idx_pos_sales_targets_user_id ON public.pos_sales_targets(user_id);

-- POS Promotions
CREATE TABLE IF NOT EXISTS public.pos_promotions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    branch_id UUID REFERENCES public.branches(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    promotion_type TEXT NOT NULL CHECK (promotion_type IN ('buy_x_get_y', 'discount', 'bundle')),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_active BOOLEAN DEFAULT true,
    conditions JSONB,
    rewards JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.pos_promotions ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Company members can view POS promotions" ON public.pos_promotions
    FOR SELECT USING (company_id IN (
        SELECT id FROM public.companies WHERE owner_id = auth.uid()
        UNION
        SELECT company_id FROM public.company_members WHERE user_id = auth.uid() AND is_active = true
    ));

CREATE POLICY IF NOT EXISTS "Company members can manage POS promotions" ON public.pos_promotions
    FOR ALL USING (company_id IN (
        SELECT id FROM public.companies WHERE owner_id = auth.uid()
        UNION
        SELECT company_id FROM public.company_members WHERE user_id = auth.uid() AND is_active = true
    ));

CREATE INDEX IF NOT EXISTS idx_pos_promotions_company_id ON public.pos_promotions(company_id);
CREATE INDEX IF NOT EXISTS idx_pos_promotions_branch_id ON public.pos_promotions(branch_id);

-- POS Terminals
CREATE TABLE IF NOT EXISTS public.pos_terminals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
    terminal_code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    terminal_type TEXT NOT NULL CHECK (terminal_type IN ('fixed', 'mobile', 'kiosk')),
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'maintenance')),
    printer_ip TEXT,
    cash_drawer_enabled BOOLEAN DEFAULT true,
    barcode_scanner_enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.pos_terminals ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Company members can view POS terminals" ON public.pos_terminals
    FOR SELECT USING (company_id IN (
        SELECT id FROM public.companies WHERE owner_id = auth.uid()
        UNION
        SELECT company_id FROM public.company_members WHERE user_id = auth.uid() AND is_active = true
    ));

CREATE POLICY IF NOT EXISTS "Company members can manage POS terminals" ON public.pos_terminals
    FOR ALL USING (company_id IN (
        SELECT id FROM public.companies WHERE owner_id = auth.uid()
        UNION
        SELECT company_id FROM public.company_members WHERE user_id = auth.uid() AND is_active = true
    ));

CREATE INDEX IF NOT EXISTS idx_pos_terminals_company_id ON public.pos_terminals(company_id);
CREATE INDEX IF NOT EXISTS idx_pos_terminals_branch_id ON public.pos_terminals(branch_id);

-- POS API Orders
CREATE TABLE IF NOT EXISTS public.pos_api_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
    order_number TEXT UNIQUE NOT NULL,
    external_order_id TEXT,
    source_platform TEXT NOT NULL,
    order_date TIMESTAMPTZ NOT NULL DEFAULT now(),
    total_amount NUMERIC(15, 2) NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled')),
    customer_name TEXT,
    customer_phone TEXT,
    customer_address TEXT,
    notes TEXT,
    sync_status TEXT DEFAULT 'pending' CHECK (sync_status IN ('pending', 'synced', 'failed')),
    synced_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.pos_api_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Company members can view POS API orders" ON public.pos_api_orders
    FOR SELECT USING (company_id IN (
        SELECT id FROM public.companies WHERE owner_id = auth.uid()
        UNION
        SELECT company_id FROM public.company_members WHERE user_id = auth.uid() AND is_active = true
    ));

CREATE POLICY IF NOT EXISTS "Company members can manage POS API orders" ON public.pos_api_orders
    FOR ALL USING (company_id IN (
        SELECT id FROM public.companies WHERE owner_id = auth.uid()
        UNION
        SELECT company_id FROM public.company_members WHERE user_id = auth.uid() AND is_active = true
    ));

CREATE INDEX IF NOT EXISTS idx_pos_api_orders_company_id ON public.pos_api_orders(company_id);
CREATE INDEX IF NOT EXISTS idx_pos_api_orders_branch_id ON public.pos_api_orders(branch_id);
CREATE INDEX IF NOT EXISTS idx_pos_api_orders_external_order_id ON public.pos_api_orders(external_order_id);

-- POS API Integrations
CREATE TABLE IF NOT EXISTS public.pos_api_integrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    branch_id UUID REFERENCES public.branches(id) ON DELETE CASCADE,
    integration_name TEXT NOT NULL,
    integration_type TEXT NOT NULL,
    api_endpoint TEXT,
    api_key TEXT,
    api_secret TEXT,
    webhook_url TEXT,
    is_active BOOLEAN DEFAULT true,
    last_sync_at TIMESTAMPTZ,
    sync_status TEXT DEFAULT 'active' CHECK (sync_status IN ('active', 'error', 'disabled')),
    settings JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.pos_api_integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Company members can view POS API integrations" ON public.pos_api_integrations
    FOR SELECT USING (company_id IN (
        SELECT id FROM public.companies WHERE owner_id = auth.uid()
        UNION
        SELECT company_id FROM public.company_members WHERE user_id = auth.uid() AND is_active = true
    ));

CREATE POLICY IF NOT EXISTS "Company members can manage POS API integrations" ON public.pos_api_integrations
    FOR ALL USING (company_id IN (
        SELECT id FROM public.companies WHERE owner_id = auth.uid()
        UNION
        SELECT company_id FROM public.company_members WHERE user_id = auth.uid() AND is_active = true
    ));

CREATE INDEX IF NOT EXISTS idx_pos_api_integrations_company_id ON public.pos_api_integrations(company_id);
CREATE INDEX IF NOT EXISTS idx_pos_api_integrations_branch_id ON public.pos_api_integrations(branch_id);

-- =============================================
-- 7. CREATE UPDATED_AT TRIGGER FUNCTION (if not exists)
-- =============================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- 8. CREATE UPDATED_AT TRIGGERS FOR ALL TABLES
-- =============================================

-- Core tables
DROP TRIGGER IF EXISTS update_companies_updated_at ON public.companies;
CREATE TRIGGER update_companies_updated_at
    BEFORE UPDATE ON public.companies
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_company_members_updated_at ON public.company_members;
CREATE TRIGGER update_company_members_updated_at
    BEFORE UPDATE ON public.company_members
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_branch_account_settings_updated_at ON public.branch_account_settings;
CREATE TRIGGER update_branch_account_settings_updated_at
    BEFORE UPDATE ON public.branch_account_settings
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- HR tables
DROP TRIGGER IF EXISTS update_hr_departments_updated_at ON public.hr_departments;
CREATE TRIGGER update_hr_departments_updated_at
    BEFORE UPDATE ON public.hr_departments
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_hr_work_shifts_updated_at ON public.hr_work_shifts;
CREATE TRIGGER update_hr_work_shifts_updated_at
    BEFORE UPDATE ON public.hr_work_shifts
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_hr_employees_updated_at ON public.hr_employees;
CREATE TRIGGER update_hr_employees_updated_at
    BEFORE UPDATE ON public.hr_employees
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_hr_leaves_updated_at ON public.hr_leaves;
CREATE TRIGGER update_hr_leaves_updated_at
    BEFORE UPDATE ON public.hr_leaves
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_hr_leave_policies_updated_at ON public.hr_leave_policies;
CREATE TRIGGER update_hr_leave_policies_updated_at
    BEFORE UPDATE ON public.hr_leave_policies
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_hr_leave_balances_updated_at ON public.hr_leave_balances;
CREATE TRIGGER update_hr_leave_balances_updated_at
    BEFORE UPDATE ON public.hr_leave_balances
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_hr_loans_updated_at ON public.hr_loans;
CREATE TRIGGER update_hr_loans_updated_at
    BEFORE UPDATE ON public.hr_loans
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_hr_deductions_updated_at ON public.hr_deductions;
CREATE TRIGGER update_hr_deductions_updated_at
    BEFORE UPDATE ON public.hr_deductions
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_hr_payroll_runs_updated_at ON public.hr_payroll_runs;
CREATE TRIGGER update_hr_payroll_runs_updated_at
    BEFORE UPDATE ON public.hr_payroll_runs
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_hr_penalty_rules_updated_at ON public.hr_penalty_rules;
CREATE TRIGGER update_hr_penalty_rules_updated_at
    BEFORE UPDATE ON public.hr_penalty_rules
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Inventory tables
DROP TRIGGER IF EXISTS update_stock_adjustments_updated_at ON public.stock_adjustments;
CREATE TRIGGER update_stock_adjustments_updated_at
    BEFORE UPDATE ON public.stock_adjustments
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_stock_transfers_updated_at ON public.stock_transfers;
CREATE TRIGGER update_stock_transfers_updated_at
    BEFORE UPDATE ON public.stock_transfers
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_internal_consumptions_updated_at ON public.internal_consumptions;
CREATE TRIGGER update_internal_consumptions_updated_at
    BEFORE UPDATE ON public.internal_consumptions
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_bill_of_materials_updated_at ON public.bill_of_materials;
CREATE TRIGGER update_bill_of_materials_updated_at
    BEFORE UPDATE ON public.bill_of_materials
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_manufacturing_orders_updated_at ON public.manufacturing_orders;
CREATE TRIGGER update_manufacturing_orders_updated_at
    BEFORE UPDATE ON public.manufacturing_orders
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_manufacturing_order_items_updated_at ON public.manufacturing_order_items;
CREATE TRIGGER update_manufacturing_order_items_updated_at
    BEFORE UPDATE ON public.manufacturing_order_items
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- POS tables
DROP TRIGGER IF EXISTS update_pos_menu_prices_updated_at ON public.pos_menu_prices;
CREATE TRIGGER update_pos_menu_prices_updated_at
    BEFORE UPDATE ON public.pos_menu_prices
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_pos_sessions_updated_at ON public.pos_sessions;
CREATE TRIGGER update_pos_sessions_updated_at
    BEFORE UPDATE ON public.pos_sessions
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_pos_transactions_updated_at ON public.pos_transactions;
CREATE TRIGGER update_pos_transactions_updated_at
    BEFORE UPDATE ON public.pos_transactions
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_pos_users_updated_at ON public.pos_users;
CREATE TRIGGER update_pos_users_updated_at
    BEFORE UPDATE ON public.pos_users
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_pos_tables_updated_at ON public.pos_tables;
CREATE TRIGGER update_pos_tables_updated_at
    BEFORE UPDATE ON public.pos_tables
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_pos_coupons_updated_at ON public.pos_coupons;
CREATE TRIGGER update_pos_coupons_updated_at
    BEFORE UPDATE ON public.pos_coupons
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_pos_sales_targets_updated_at ON public.pos_sales_targets;
CREATE TRIGGER update_pos_sales_targets_updated_at
    BEFORE UPDATE ON public.pos_sales_targets
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_pos_promotions_updated_at ON public.pos_promotions;
CREATE TRIGGER update_pos_promotions_updated_at
    BEFORE UPDATE ON public.pos_promotions
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_pos_terminals_updated_at ON public.pos_terminals;
CREATE TRIGGER update_pos_terminals_updated_at
    BEFORE UPDATE ON public.pos_terminals
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_pos_api_orders_updated_at ON public.pos_api_orders;
CREATE TRIGGER update_pos_api_orders_updated_at
    BEFORE UPDATE ON public.pos_api_orders
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_pos_api_integrations_updated_at ON public.pos_api_integrations;
CREATE TRIGGER update_pos_api_integrations_updated_at
    BEFORE UPDATE ON public.pos_api_integrations
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- DONE: All missing tables created
-- =============================================
