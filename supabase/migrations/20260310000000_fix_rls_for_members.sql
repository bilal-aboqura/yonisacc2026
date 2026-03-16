-- =============================================
-- MIGRATION: Replace is_company_owner() with is_company_member()
-- Purpose: Allow team members (company_members) to access company data via RLS
-- =============================================

-- 0. Create the company_members table (team members of a company)
-- =============================================
CREATE TABLE IF NOT EXISTS public.company_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role app_role NOT NULL DEFAULT 'client',
    is_active BOOLEAN NOT NULL DEFAULT true,
    invited_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (company_id, user_id)
);

ALTER TABLE public.company_members ENABLE ROW LEVEL SECURITY;

-- Company owner can manage members
CREATE POLICY "Company owner can manage members" ON public.company_members
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.companies WHERE id = company_id AND owner_id = auth.uid())
    );

-- Members can view their own membership
CREATE POLICY "Members can view own membership" ON public.company_members
    FOR SELECT USING (user_id = auth.uid());

CREATE TRIGGER update_company_members_updated_at
    BEFORE UPDATE ON public.company_members
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- 1. Create the new is_company_member() function
-- Returns TRUE if auth.uid() is either:
--   (a) the company owner, OR
--   (b) an active member in company_members
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

-- =============================================
-- 2. Fix COMPANIES table: allow members to SELECT
-- =============================================
DROP POLICY IF EXISTS "Company members can view" ON public.companies;
DROP POLICY IF EXISTS "Company owner can manage" ON public.companies;

CREATE POLICY "Company members can view" ON public.companies
    FOR SELECT USING (
        owner_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.company_members
            WHERE company_id = id AND user_id = auth.uid() AND is_active = true
        )
    );

CREATE POLICY "Company owner can manage" ON public.companies
    FOR ALL USING (owner_id = auth.uid());

-- =============================================
-- 3. Fix SUBSCRIPTIONS table
-- =============================================
DROP POLICY IF EXISTS "Company owner can view subscriptions" ON public.subscriptions;
CREATE POLICY "Company members can view subscriptions" ON public.subscriptions
    FOR SELECT USING (is_company_member(company_id));
-- "Owners can manage all subscriptions" policy (for platform owners) stays as is.

-- =============================================
-- 4. Fix CLIENT_SCREENS table
-- =============================================
DROP POLICY IF EXISTS "Company owner can view custom screens" ON public.client_screens;
CREATE POLICY "Company members can view custom screens" ON public.client_screens
    FOR SELECT USING (is_company_member(company_id));
-- "Owners can manage client screens" policy stays for platform owners.

-- =============================================
-- 5. Fix BRANCHES table
-- =============================================
DROP POLICY IF EXISTS "Company members can view branches" ON public.branches;
DROP POLICY IF EXISTS "Company owner can manage branches" ON public.branches;

CREATE POLICY "Company members can view branches" ON public.branches
    FOR SELECT USING (is_company_member(company_id));

CREATE POLICY "Company owner can manage branches" ON public.branches
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.companies WHERE id = company_id AND owner_id = auth.uid())
    );

-- =============================================
-- 6. Fix CONTACTS table
-- =============================================
DROP POLICY IF EXISTS "Company owner can view contacts" ON public.contacts;
DROP POLICY IF EXISTS "Company owner can manage contacts" ON public.contacts;

CREATE POLICY "Company members can view contacts" ON public.contacts
    FOR SELECT USING (is_company_member(company_id));

CREATE POLICY "Company members can manage contacts" ON public.contacts
    FOR ALL USING (is_company_member(company_id));

-- =============================================
-- 7. Fix PRODUCT_CATEGORIES table
-- =============================================
DROP POLICY IF EXISTS "Company owner can view categories" ON public.product_categories;
DROP POLICY IF EXISTS "Company owner can manage categories" ON public.product_categories;

CREATE POLICY "Company members can view categories" ON public.product_categories
    FOR SELECT USING (is_company_member(company_id));

CREATE POLICY "Company members can manage categories" ON public.product_categories
    FOR ALL USING (is_company_member(company_id));

-- =============================================
-- 8. Fix PRODUCTS table
-- =============================================
DROP POLICY IF EXISTS "Company owner can view products" ON public.products;
DROP POLICY IF EXISTS "Company owner can manage products" ON public.products;

CREATE POLICY "Company members can view products" ON public.products
    FOR SELECT USING (is_company_member(company_id));

CREATE POLICY "Company members can manage products" ON public.products
    FOR ALL USING (is_company_member(company_id));

-- =============================================
-- 9. Fix WAREHOUSES table
-- =============================================
DROP POLICY IF EXISTS "Company owner can view warehouses" ON public.warehouses;
DROP POLICY IF EXISTS "Company owner can manage warehouses" ON public.warehouses;

CREATE POLICY "Company members can view warehouses" ON public.warehouses
    FOR SELECT USING (is_company_member(company_id));

CREATE POLICY "Company members can manage warehouses" ON public.warehouses
    FOR ALL USING (is_company_member(company_id));

-- =============================================
-- 10. Fix PRODUCT_STOCK table
-- =============================================
DROP POLICY IF EXISTS "Company owner can view stock" ON public.product_stock;
DROP POLICY IF EXISTS "Company owner can manage stock" ON public.product_stock;

CREATE POLICY "Company members can view stock" ON public.product_stock
    FOR SELECT USING (EXISTS (
        SELECT 1 FROM public.products p
        WHERE p.id = product_id AND is_company_member(p.company_id)
    ));

CREATE POLICY "Company members can manage stock" ON public.product_stock
    FOR ALL USING (EXISTS (
        SELECT 1 FROM public.products p
        WHERE p.id = product_id AND is_company_member(p.company_id)
    ));

-- =============================================
-- 11. Fix ACCOUNTS table
-- =============================================
DROP POLICY IF EXISTS "Company owner can view accounts" ON public.accounts;
DROP POLICY IF EXISTS "Company owner can manage accounts" ON public.accounts;

CREATE POLICY "Company members can view accounts" ON public.accounts
    FOR SELECT USING (is_company_member(company_id));

CREATE POLICY "Company members can manage accounts" ON public.accounts
    FOR ALL USING (is_company_member(company_id));

-- =============================================
-- 12. Fix INVOICES table
-- =============================================
DROP POLICY IF EXISTS "Company owner can view invoices" ON public.invoices;
DROP POLICY IF EXISTS "Company owner can manage invoices" ON public.invoices;

CREATE POLICY "Company members can view invoices" ON public.invoices
    FOR SELECT USING (is_company_member(company_id));

CREATE POLICY "Company members can manage invoices" ON public.invoices
    FOR ALL USING (is_company_member(company_id));

-- =============================================
-- 13. Fix INVOICE_ITEMS table
-- =============================================
DROP POLICY IF EXISTS "Company owner can view invoice items" ON public.invoice_items;
DROP POLICY IF EXISTS "Company owner can manage invoice items" ON public.invoice_items;

CREATE POLICY "Company members can view invoice items" ON public.invoice_items
    FOR SELECT USING (EXISTS (
        SELECT 1 FROM public.invoices i
        WHERE i.id = invoice_id AND is_company_member(i.company_id)
    ));

CREATE POLICY "Company members can manage invoice items" ON public.invoice_items
    FOR ALL USING (EXISTS (
        SELECT 1 FROM public.invoices i
        WHERE i.id = invoice_id AND is_company_member(i.company_id)
    ));

-- =============================================
-- 14. Fix JOURNAL_ENTRIES table
-- =============================================
DROP POLICY IF EXISTS "Company owner can view journal entries" ON public.journal_entries;
DROP POLICY IF EXISTS "Company owner can manage journal entries" ON public.journal_entries;

CREATE POLICY "Company members can view journal entries" ON public.journal_entries
    FOR SELECT USING (is_company_member(company_id));

CREATE POLICY "Company members can manage journal entries" ON public.journal_entries
    FOR ALL USING (is_company_member(company_id));

-- =============================================
-- 15. Fix JOURNAL_ENTRY_LINES table
-- =============================================
DROP POLICY IF EXISTS "Company owner can view entry lines" ON public.journal_entry_lines;
DROP POLICY IF EXISTS "Company owner can manage entry lines" ON public.journal_entry_lines;

CREATE POLICY "Company members can view entry lines" ON public.journal_entry_lines
    FOR SELECT USING (EXISTS (
        SELECT 1 FROM public.journal_entries je
        WHERE je.id = entry_id AND is_company_member(je.company_id)
    ));

CREATE POLICY "Company members can manage entry lines" ON public.journal_entry_lines
    FOR ALL USING (EXISTS (
        SELECT 1 FROM public.journal_entries je
        WHERE je.id = entry_id AND is_company_member(je.company_id)
    ));

-- =============================================
-- 16. Fix TREASURY_TRANSACTIONS table
-- =============================================
DROP POLICY IF EXISTS "Company owner can view treasury transactions" ON public.treasury_transactions;
DROP POLICY IF EXISTS "Company owner can manage treasury transactions" ON public.treasury_transactions;

CREATE POLICY "Company members can view treasury transactions" ON public.treasury_transactions
    FOR SELECT USING (is_company_member(company_id));

CREATE POLICY "Company members can manage treasury transactions" ON public.treasury_transactions
    FOR ALL USING (is_company_member(company_id));

-- =============================================
-- 17. Fix STOCK_MOVEMENTS table
-- =============================================
DROP POLICY IF EXISTS "Company owner can view stock movements" ON public.stock_movements;
DROP POLICY IF EXISTS "Company owner can manage stock movements" ON public.stock_movements;

CREATE POLICY "Company members can view stock movements" ON public.stock_movements
    FOR SELECT USING (is_company_member(company_id));

CREATE POLICY "Company members can manage stock movements" ON public.stock_movements
    FOR ALL USING (is_company_member(company_id));

-- =============================================
-- 18. Fix INVOICE_PAYMENTS table
-- =============================================
DROP POLICY IF EXISTS "Company owner can view invoice payments" ON public.invoice_payments;
DROP POLICY IF EXISTS "Company owner can manage invoice payments" ON public.invoice_payments;

CREATE POLICY "Company members can view invoice payments" ON public.invoice_payments
    FOR SELECT USING (is_company_member(company_id));

CREATE POLICY "Company members can manage invoice payments" ON public.invoice_payments
    FOR ALL USING (is_company_member(company_id));

-- =============================================
-- 19. Fix BANK_ACCOUNTS table
-- =============================================
DROP POLICY IF EXISTS "Company owner can view bank accounts" ON public.bank_accounts;
DROP POLICY IF EXISTS "Company owner can manage bank accounts" ON public.bank_accounts;

CREATE POLICY "Company members can view bank accounts" ON public.bank_accounts
    FOR SELECT USING (is_company_member(company_id));

CREATE POLICY "Company members can manage bank accounts" ON public.bank_accounts
    FOR ALL USING (is_company_member(company_id));

-- =============================================
-- 20. Fix FISCAL_PERIODS table
-- =============================================
DROP POLICY IF EXISTS "Company owner can view fiscal periods" ON public.fiscal_periods;
DROP POLICY IF EXISTS "Company owner can manage fiscal periods" ON public.fiscal_periods;

CREATE POLICY "Company members can view fiscal periods" ON public.fiscal_periods
    FOR SELECT USING (is_company_member(company_id));

CREATE POLICY "Company members can manage fiscal periods" ON public.fiscal_periods
    FOR ALL USING (is_company_member(company_id));

-- =============================================
-- 21. Fix UNITS table
-- =============================================
DROP POLICY IF EXISTS "Company owner can view units" ON public.units;
DROP POLICY IF EXISTS "Company owner can manage units" ON public.units;

CREATE POLICY "Company members can view units" ON public.units
    FOR SELECT USING (is_company_member(company_id));

CREATE POLICY "Company members can manage units" ON public.units
    FOR ALL USING (is_company_member(company_id));

-- =============================================
-- 22. Fix PRICE_LISTS table
-- =============================================
DROP POLICY IF EXISTS "Company owner can view price lists" ON public.price_lists;
DROP POLICY IF EXISTS "Company owner can manage price lists" ON public.price_lists;

CREATE POLICY "Company members can view price lists" ON public.price_lists
    FOR SELECT USING (is_company_member(company_id));

CREATE POLICY "Company members can manage price lists" ON public.price_lists
    FOR ALL USING (is_company_member(company_id));

-- =============================================
-- 23. Fix PRICE_LIST_ITEMS table
-- =============================================
DROP POLICY IF EXISTS "Company owner can view price list items" ON public.price_list_items;
DROP POLICY IF EXISTS "Company owner can manage price list items" ON public.price_list_items;

CREATE POLICY "Company members can view price list items" ON public.price_list_items
    FOR SELECT USING (EXISTS (
        SELECT 1 FROM public.price_lists pl
        WHERE pl.id = price_list_items.price_list_id AND is_company_member(pl.company_id)
    ));

CREATE POLICY "Company members can manage price list items" ON public.price_list_items
    FOR ALL USING (EXISTS (
        SELECT 1 FROM public.price_lists pl
        WHERE pl.id = price_list_items.price_list_id AND is_company_member(pl.company_id)
    ));

-- =============================================
-- 24. Fix COMPANY_SETTINGS table
-- =============================================
DROP POLICY IF EXISTS "Company owner can view company settings" ON public.company_settings;
DROP POLICY IF EXISTS "Company owner can manage company settings" ON public.company_settings;

CREATE POLICY "Company members can view company settings" ON public.company_settings
    FOR SELECT USING (is_company_member(company_id));

CREATE POLICY "Company members can manage company settings" ON public.company_settings
    FOR ALL USING (is_company_member(company_id));

-- =============================================
-- 25. Fix COST_CENTERS table
-- =============================================
DROP POLICY IF EXISTS "Company owner can view cost centers" ON public.cost_centers;
DROP POLICY IF EXISTS "Company owner can manage cost centers" ON public.cost_centers;

CREATE POLICY "Company members can view cost centers" ON public.cost_centers
    FOR SELECT USING (is_company_member(company_id));

CREATE POLICY "Company members can manage cost centers" ON public.cost_centers
    FOR ALL USING (is_company_member(company_id));

-- =============================================
-- DONE: is_company_owner() is kept for backward compat but no longer used in policies.
-- All policies now use is_company_member() which supports both owners and team members.
-- =============================================
