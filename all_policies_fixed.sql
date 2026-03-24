-- ==========================================================
-- ALL RLS POLICIES FOR LOVABLE TABLES (FIXED)
-- ==========================================================

-- ─── PREREQUISITE FUNCTIONS ───────────────────────────────
-- These must exist before any policy can reference them.

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS boolean
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

-- ─── ENABLE RLS ON ALL TABLES ─────────────────────────────
ALTER TABLE IF EXISTS public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.asset_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.asset_depreciation_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.asset_maintenance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.bill_of_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.bom_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.branch_account_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.branch_payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.business_verticals ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.car_brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.car_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.client_screens ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.clinic_account_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.clinic_invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.clinic_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.company_feature_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.company_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.company_permission_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.company_print_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.company_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.contact_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.cost_centers ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.delivery_account_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.delivery_areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.delivery_drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.delivery_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.doctors ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.feature_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.fiscal_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.fiscal_year_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.fixed_asset_account_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.fixed_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.fuel_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.fuel_message_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.fuel_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.fuel_pumps ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.fuel_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.fuel_station_account_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.fuel_tank_refills ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.fuel_tanks ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.fuel_wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.fuel_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.global_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.gold_account_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.gold_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.gold_price_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.gold_purchase_invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.gold_purchase_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.gold_sales_invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.gold_sales_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.hr_account_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.hr_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.hr_deductions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.hr_departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.hr_employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.hr_leave_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.hr_leave_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.hr_leaves ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.hr_loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.hr_payroll_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.hr_payroll_payment_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.hr_payroll_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.hr_payroll_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.hr_penalty_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.hr_work_shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.internal_consumption_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.internal_consumptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.invoice_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.journal_entry_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.landing_faq ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.landing_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.landing_hero ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.manufacturing_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.opening_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.owner_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.plan_feature_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.plan_permission_bounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.plan_screens ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.pos_account_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.pos_activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.pos_api_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.pos_api_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.pos_api_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.pos_coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.pos_menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.pos_menu_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.pos_menus ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.pos_promotion_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.pos_promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.pos_reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.pos_sales_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.pos_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.pos_tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.pos_terminals ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.pos_transaction_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.pos_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.pos_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.prescription_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.prescriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.price_list_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.price_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.product_car_compatibility ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.product_stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.rbac_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.rbac_role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.rbac_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.rbac_user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.re_account_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.re_leases ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.re_maintenance_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.re_properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.re_rent_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.re_rent_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.re_tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.re_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.stock_adjustment_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.stock_adjustments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.stock_count_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.stock_count_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.stock_transfer_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.stock_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.system_screens ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.testimonials ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.treasury_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.units ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.usage_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.vertical_screens ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.warehouses ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.zatca_invoice_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.zatca_retry_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.zatca_settings ENABLE ROW LEVEL SECURITY;

-- ─── GRANT DATA API ACCESS ───────────────────────────────
-- Without these, PostgREST (Supabase Data API) cannot access tables at all.
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

-- ─── POLICIES START ───────────────────────────────────────

DROP POLICY IF EXISTS "Company members can view accounts" ON public."accounts";
CREATE POLICY "Company members can view accounts" ON public."accounts" FOR SELECT USING (is_company_member(company_id));

DROP POLICY IF EXISTS "Company members can manage accounts" ON public."accounts";
CREATE POLICY "Company members can manage accounts" ON public."accounts" FOR ALL USING (is_company_member(company_id));

DROP POLICY IF EXISTS "Company access appointments" ON public."appointments";
CREATE POLICY "Company access appointments" ON public."appointments" FOR ALL USING ((company_id IN ( SELECT company_members.company_id FROM company_members WHERE ((company_members.user_id = auth.uid()) AND (company_members.is_active = true)) UNION SELECT companies.id FROM companies WHERE (companies.owner_id = auth.uid()))));

DROP POLICY IF EXISTS "Users can manage own company asset categories" ON public."asset_categories";
CREATE POLICY "Users can manage own company asset categories" ON public."asset_categories" FOR ALL TO authenticated USING ((company_id IN ( SELECT companies.id FROM companies WHERE (companies.owner_id = auth.uid()) UNION SELECT company_members.company_id FROM company_members WHERE ((company_members.user_id = auth.uid()) AND (company_members.is_active = true)))));

DROP POLICY IF EXISTS "Users can manage own company depreciation entries" ON public."asset_depreciation_entries";
CREATE POLICY "Users can manage own company depreciation entries" ON public."asset_depreciation_entries" FOR ALL TO authenticated USING ((company_id IN ( SELECT companies.id FROM companies WHERE (companies.owner_id = auth.uid()) UNION SELECT company_members.company_id FROM company_members WHERE ((company_members.user_id = auth.uid()) AND (company_members.is_active = true)))));

DROP POLICY IF EXISTS "Users can manage own company maintenance records" ON public."asset_maintenance_records";
CREATE POLICY "Users can manage own company maintenance records" ON public."asset_maintenance_records" FOR ALL TO authenticated USING ((company_id IN ( SELECT companies.id FROM companies WHERE (companies.owner_id = auth.uid()) UNION SELECT company_members.company_id FROM company_members WHERE ((company_members.user_id = auth.uid()) AND (company_members.is_active = true)))));

DROP POLICY IF EXISTS "Company owners can view their audit logs" ON public."audit_logs";
CREATE POLICY "Company owners can view their audit logs" ON public."audit_logs" FOR SELECT USING ((company_id IN ( SELECT companies.id FROM companies WHERE (companies.owner_id = auth.uid()))));

DROP POLICY IF EXISTS "Owners can view all audit logs" ON public."audit_logs";
CREATE POLICY "Owners can view all audit logs" ON public."audit_logs" FOR SELECT USING (has_role(auth.uid(), 'owner'::app_role));

DROP POLICY IF EXISTS "System can insert audit logs" ON public."audit_logs";
CREATE POLICY "System can insert audit logs" ON public."audit_logs" FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Company members can view bank accounts" ON public."bank_accounts";
CREATE POLICY "Company members can view bank accounts" ON public."bank_accounts" FOR SELECT USING (is_company_member(company_id));

DROP POLICY IF EXISTS "deny_anon_read_bank_accounts" ON public."bank_accounts";
CREATE POLICY "deny_anon_read_bank_accounts" ON public."bank_accounts" FOR SELECT TO anon USING (false);

DROP POLICY IF EXISTS "Company members can manage bank accounts" ON public."bank_accounts";
CREATE POLICY "Company members can manage bank accounts" ON public."bank_accounts" FOR ALL USING (is_company_member(company_id));

DROP POLICY IF EXISTS "Company owner can view bill_of_materials" ON public."bill_of_materials";
CREATE POLICY "Company owner can view bill_of_materials" ON public."bill_of_materials" FOR SELECT USING (is_company_owner(company_id));

DROP POLICY IF EXISTS "Company owner can manage bill_of_materials" ON public."bill_of_materials";
CREATE POLICY "Company owner can manage bill_of_materials" ON public."bill_of_materials" FOR ALL USING (is_company_owner(company_id));

DROP POLICY IF EXISTS "View bom_items" ON public."bom_items";
CREATE POLICY "View bom_items" ON public."bom_items" FOR SELECT USING ((EXISTS ( SELECT 1 FROM bill_of_materials bom WHERE ((bom.id = bom_items.bom_id) AND is_company_owner(bom.company_id)))));

DROP POLICY IF EXISTS "Manage bom_items" ON public."bom_items";
CREATE POLICY "Manage bom_items" ON public."bom_items" FOR ALL USING ((EXISTS ( SELECT 1 FROM bill_of_materials bom WHERE ((bom.id = bom_items.bom_id) AND is_company_owner(bom.company_id)))));

DROP POLICY IF EXISTS "Company owner can view branch account settings" ON public."branch_account_settings";
CREATE POLICY "Company owner can view branch account settings" ON public."branch_account_settings" FOR SELECT USING (is_company_owner(company_id));

DROP POLICY IF EXISTS "Company owner can manage branch account settings" ON public."branch_account_settings";
CREATE POLICY "Company owner can manage branch account settings" ON public."branch_account_settings" FOR ALL USING (is_company_owner(company_id));

DROP POLICY IF EXISTS "Users can view branch payment methods for their company" ON public."branch_payment_methods";
CREATE POLICY "Users can view branch payment methods for their company" ON public."branch_payment_methods" FOR SELECT TO authenticated USING (((company_id IN ( SELECT company_members.company_id FROM company_members WHERE ((company_members.user_id = auth.uid()) AND (company_members.is_active = true)))) OR (company_id IN ( SELECT companies.id FROM companies WHERE (companies.owner_id = auth.uid())))));

DROP POLICY IF EXISTS "Users can manage branch payment methods for their company" ON public."branch_payment_methods";
CREATE POLICY "Users can manage branch payment methods for their company" ON public."branch_payment_methods" FOR ALL TO authenticated USING (((company_id IN ( SELECT companies.id FROM companies WHERE (companies.owner_id = auth.uid()))) OR (company_id IN ( SELECT company_members.company_id FROM company_members WHERE ((company_members.user_id = auth.uid()) AND (company_members.is_active = true))))));

DROP POLICY IF EXISTS "Company members can view branches" ON public."branches";
CREATE POLICY "Company members can view branches" ON public."branches" FOR SELECT USING (is_company_member(company_id));

DROP POLICY IF EXISTS "Company owner can manage branches" ON public."branches";
CREATE POLICY "Company owner can manage branches" ON public."branches" FOR ALL USING ((EXISTS ( SELECT 1 FROM companies WHERE ((companies.id = branches.company_id) AND (companies.owner_id = auth.uid())))));

DROP POLICY IF EXISTS "Anyone can view active verticals" ON public."business_verticals";
CREATE POLICY "Anyone can view active verticals" ON public."business_verticals" FOR SELECT USING ((is_active = true));

DROP POLICY IF EXISTS "Owners can manage verticals" ON public."business_verticals";
CREATE POLICY "Owners can manage verticals" ON public."business_verticals" FOR ALL USING (has_role(auth.uid(), 'owner'::app_role));

DROP POLICY IF EXISTS "Company owner can view car brands" ON public."car_brands";
CREATE POLICY "Company owner can view car brands" ON public."car_brands" FOR SELECT USING (is_company_owner(company_id));

DROP POLICY IF EXISTS "Company owner can manage car brands" ON public."car_brands";
CREATE POLICY "Company owner can manage car brands" ON public."car_brands" FOR ALL USING (is_company_owner(company_id));

DROP POLICY IF EXISTS "Company owner can view car models" ON public."car_models";
CREATE POLICY "Company owner can view car models" ON public."car_models" FOR SELECT USING (is_company_owner(company_id));

DROP POLICY IF EXISTS "Company owner can manage car models" ON public."car_models";
CREATE POLICY "Company owner can manage car models" ON public."car_models" FOR ALL USING (is_company_owner(company_id));

DROP POLICY IF EXISTS "Company members can view custom screens" ON public."client_screens";
CREATE POLICY "Company members can view custom screens" ON public."client_screens" FOR SELECT USING (is_company_member(company_id));

DROP POLICY IF EXISTS "Owners can manage client screens" ON public."client_screens";
CREATE POLICY "Owners can manage client screens" ON public."client_screens" FOR ALL USING (has_role(auth.uid(), 'owner'::app_role));

DROP POLICY IF EXISTS "Company access clinic_account_settings" ON public."clinic_account_settings";
CREATE POLICY "Company access clinic_account_settings" ON public."clinic_account_settings" FOR ALL USING ((company_id IN ( SELECT company_members.company_id FROM company_members WHERE ((company_members.user_id = auth.uid()) AND (company_members.is_active = true)) UNION SELECT companies.id FROM companies WHERE (companies.owner_id = auth.uid()))));

DROP POLICY IF EXISTS "Company access clinic_invoice_items" ON public."clinic_invoice_items";
CREATE POLICY "Company access clinic_invoice_items" ON public."clinic_invoice_items" FOR ALL USING ((invoice_id IN ( SELECT clinic_invoices.id FROM clinic_invoices WHERE (clinic_invoices.company_id IN ( SELECT company_members.company_id FROM company_members WHERE ((company_members.user_id = auth.uid()) AND (company_members.is_active = true)) UNION SELECT companies.id FROM companies WHERE (companies.owner_id = auth.uid()))))));

DROP POLICY IF EXISTS "Company access clinic_invoices" ON public."clinic_invoices";
CREATE POLICY "Company access clinic_invoices" ON public."clinic_invoices" FOR ALL USING ((company_id IN ( SELECT company_members.company_id FROM company_members WHERE ((company_members.user_id = auth.uid()) AND (company_members.is_active = true)) UNION SELECT companies.id FROM companies WHERE (companies.owner_id = auth.uid()))));

DROP POLICY IF EXISTS "Company members can view" ON public."companies";
CREATE POLICY "Company members can view" ON public."companies" FOR SELECT USING (((owner_id = auth.uid()) OR (EXISTS ( SELECT 1 FROM company_members WHERE ((company_members.company_id = company_members.id) AND (company_members.user_id = auth.uid()) AND (company_members.is_active = true))))));

DROP POLICY IF EXISTS "Company owner can read own company" ON public."companies";
CREATE POLICY "Company owner can read own company" ON public."companies" FOR SELECT USING (((auth.uid() IS NOT NULL) AND (owner_id = auth.uid())));

DROP POLICY IF EXISTS "Owners can view all companies" ON public."companies";
CREATE POLICY "Owners can view all companies" ON public."companies" FOR SELECT USING (has_role(auth.uid(), 'owner'::app_role));

DROP POLICY IF EXISTS "Company owner can update own company" ON public."companies";
CREATE POLICY "Company owner can update own company" ON public."companies" FOR UPDATE USING ((owner_id = auth.uid()));

DROP POLICY IF EXISTS "Owners can update all companies" ON public."companies";
CREATE POLICY "Owners can update all companies" ON public."companies" FOR UPDATE USING (has_role(auth.uid(), 'owner'::app_role));

DROP POLICY IF EXISTS "Company owner can delete own company" ON public."companies";
CREATE POLICY "Company owner can delete own company" ON public."companies" FOR DELETE USING ((owner_id = auth.uid()));

DROP POLICY IF EXISTS "Company owner can manage" ON public."companies";
CREATE POLICY "Company owner can manage" ON public."companies" FOR ALL USING ((owner_id = auth.uid()));

DROP POLICY IF EXISTS "Company owner can view own overrides" ON public."company_feature_overrides";
CREATE POLICY "Company owner can view own overrides" ON public."company_feature_overrides" FOR SELECT USING (is_company_owner(company_id));

DROP POLICY IF EXISTS "Owners can manage overrides" ON public."company_feature_overrides";
CREATE POLICY "Owners can manage overrides" ON public."company_feature_overrides" FOR ALL USING (has_role(auth.uid(), 'owner'::app_role));

DROP POLICY IF EXISTS "Platform owner can manage all members" ON public."company_members";
CREATE POLICY "Platform owner can manage all members" ON public."company_members" FOR ALL TO authenticated USING (has_role(auth.uid(), 'owner'::app_role));

DROP POLICY IF EXISTS "Members can view own membership" ON public."company_members";
CREATE POLICY "Members can view own membership" ON public."company_members" FOR SELECT USING ((auth.uid() = user_id));

DROP POLICY IF EXISTS "Company owner can manage members" ON public."company_members";
CREATE POLICY "Company owner can manage members" ON public."company_members" FOR ALL USING (is_company_owner(company_id));

DROP POLICY IF EXISTS "Company owner can view own overrides" ON public."company_permission_overrides";
CREATE POLICY "Company owner can view own overrides" ON public."company_permission_overrides" FOR SELECT USING (is_company_owner(company_id));

DROP POLICY IF EXISTS "Platform owner can manage all overrides" ON public."company_permission_overrides";
CREATE POLICY "Platform owner can manage all overrides" ON public."company_permission_overrides" FOR ALL USING (has_role(auth.uid(), 'owner'::app_role));

DROP POLICY IF EXISTS "Company owner can view print settings" ON public."company_print_settings";
CREATE POLICY "Company owner can view print settings" ON public."company_print_settings" FOR SELECT USING (is_company_owner(company_id));

DROP POLICY IF EXISTS "Company owner can manage print settings" ON public."company_print_settings";
CREATE POLICY "Company owner can manage print settings" ON public."company_print_settings" FOR ALL USING (is_company_owner(company_id));

DROP POLICY IF EXISTS "Company members can view company settings" ON public."company_settings";
CREATE POLICY "Company members can view company settings" ON public."company_settings" FOR SELECT USING (is_company_member(company_id));

DROP POLICY IF EXISTS "Company members can manage company settings" ON public."company_settings";
CREATE POLICY "Company members can manage company settings" ON public."company_settings" FOR ALL USING (is_company_member(company_id));

DROP POLICY IF EXISTS "Owners can view messages" ON public."contact_messages";
CREATE POLICY "Owners can view messages" ON public."contact_messages" FOR SELECT USING (has_role(auth.uid(), 'owner'::app_role));

DROP POLICY IF EXISTS "deny_anon_read_contact_messages" ON public."contact_messages";
CREATE POLICY "deny_anon_read_contact_messages" ON public."contact_messages" FOR SELECT TO anon USING (false);

DROP POLICY IF EXISTS "Anyone can insert contact messages" ON public."contact_messages";
CREATE POLICY "Anyone can insert contact messages" ON public."contact_messages" FOR INSERT WITH CHECK (((name IS NOT NULL) AND (email IS NOT NULL) AND (message IS NOT NULL) AND (length(name) > 0) AND (length(email) > 0) AND (length(message) > 0)));

DROP POLICY IF EXISTS "Owners can update messages" ON public."contact_messages";
CREATE POLICY "Owners can update messages" ON public."contact_messages" FOR UPDATE USING (has_role(auth.uid(), 'owner'::app_role));

DROP POLICY IF EXISTS "Company members can view contacts" ON public."contacts";
CREATE POLICY "Company members can view contacts" ON public."contacts" FOR SELECT USING (is_company_member(company_id));

DROP POLICY IF EXISTS "deny_anon_read_contacts" ON public."contacts";
CREATE POLICY "deny_anon_read_contacts" ON public."contacts" FOR SELECT TO anon USING (false);

DROP POLICY IF EXISTS "Company members can manage contacts" ON public."contacts";
CREATE POLICY "Company members can manage contacts" ON public."contacts" FOR ALL USING (is_company_member(company_id));

DROP POLICY IF EXISTS "Company members can view cost centers" ON public."cost_centers";
CREATE POLICY "Company members can view cost centers" ON public."cost_centers" FOR SELECT USING (is_company_member(company_id));

DROP POLICY IF EXISTS "Company members can manage cost centers" ON public."cost_centers";
CREATE POLICY "Company members can manage cost centers" ON public."cost_centers" FOR ALL USING (is_company_member(company_id));

DROP POLICY IF EXISTS "delivery_account_settings_select" ON public."delivery_account_settings";
CREATE POLICY "delivery_account_settings_select" ON public."delivery_account_settings" FOR SELECT TO authenticated USING (((company_id IN ( SELECT companies.id FROM companies WHERE (companies.owner_id = auth.uid()))) OR (company_id IN ( SELECT company_members.company_id FROM company_members WHERE ((company_members.user_id = auth.uid()) AND (company_members.is_active = true))))));

DROP POLICY IF EXISTS "delivery_account_settings_insert" ON public."delivery_account_settings";
CREATE POLICY "delivery_account_settings_insert" ON public."delivery_account_settings" FOR INSERT TO authenticated WITH CHECK (((company_id IN ( SELECT companies.id FROM companies WHERE (companies.owner_id = auth.uid()))) OR (company_id IN ( SELECT company_members.company_id FROM company_members WHERE ((company_members.user_id = auth.uid()) AND (company_members.is_active = true))))));

DROP POLICY IF EXISTS "delivery_account_settings_update" ON public."delivery_account_settings";
CREATE POLICY "delivery_account_settings_update" ON public."delivery_account_settings" FOR UPDATE TO authenticated USING (((company_id IN ( SELECT companies.id FROM companies WHERE (companies.owner_id = auth.uid()))) OR (company_id IN ( SELECT company_members.company_id FROM company_members WHERE ((company_members.user_id = auth.uid()) AND (company_members.is_active = true))))));

DROP POLICY IF EXISTS "delivery_areas_select" ON public."delivery_areas";
CREATE POLICY "delivery_areas_select" ON public."delivery_areas" FOR SELECT TO authenticated USING (((company_id IN ( SELECT companies.id FROM companies WHERE (companies.owner_id = auth.uid()))) OR (company_id IN ( SELECT company_members.company_id FROM company_members WHERE ((company_members.user_id = auth.uid()) AND (company_members.is_active = true))))));

DROP POLICY IF EXISTS "delivery_areas_insert" ON public."delivery_areas";
CREATE POLICY "delivery_areas_insert" ON public."delivery_areas" FOR INSERT TO authenticated WITH CHECK (((company_id IN ( SELECT companies.id FROM companies WHERE (companies.owner_id = auth.uid()))) OR (company_id IN ( SELECT company_members.company_id FROM company_members WHERE ((company_members.user_id = auth.uid()) AND (company_members.is_active = true))))));

DROP POLICY IF EXISTS "delivery_areas_update" ON public."delivery_areas";
CREATE POLICY "delivery_areas_update" ON public."delivery_areas" FOR UPDATE TO authenticated USING (((company_id IN ( SELECT companies.id FROM companies WHERE (companies.owner_id = auth.uid()))) OR (company_id IN ( SELECT company_members.company_id FROM company_members WHERE ((company_members.user_id = auth.uid()) AND (company_members.is_active = true))))));

DROP POLICY IF EXISTS "delivery_areas_delete" ON public."delivery_areas";
CREATE POLICY "delivery_areas_delete" ON public."delivery_areas" FOR DELETE TO authenticated USING (((company_id IN ( SELECT companies.id FROM companies WHERE (companies.owner_id = auth.uid()))) OR (company_id IN ( SELECT company_members.company_id FROM company_members WHERE ((company_members.user_id = auth.uid()) AND (company_members.is_active = true))))));

DROP POLICY IF EXISTS "delivery_drivers_select" ON public."delivery_drivers";
CREATE POLICY "delivery_drivers_select" ON public."delivery_drivers" FOR SELECT TO authenticated USING (((company_id IN ( SELECT companies.id FROM companies WHERE (companies.owner_id = auth.uid()))) OR (company_id IN ( SELECT company_members.company_id FROM company_members WHERE ((company_members.user_id = auth.uid()) AND (company_members.is_active = true))))));

DROP POLICY IF EXISTS "delivery_drivers_insert" ON public."delivery_drivers";
CREATE POLICY "delivery_drivers_insert" ON public."delivery_drivers" FOR INSERT TO authenticated WITH CHECK (((company_id IN ( SELECT companies.id FROM companies WHERE (companies.owner_id = auth.uid()))) OR (company_id IN ( SELECT company_members.company_id FROM company_members WHERE ((company_members.user_id = auth.uid()) AND (company_members.is_active = true))))));

DROP POLICY IF EXISTS "delivery_drivers_update" ON public."delivery_drivers";
CREATE POLICY "delivery_drivers_update" ON public."delivery_drivers" FOR UPDATE TO authenticated USING (((company_id IN ( SELECT companies.id FROM companies WHERE (companies.owner_id = auth.uid()))) OR (company_id IN ( SELECT company_members.company_id FROM company_members WHERE ((company_members.user_id = auth.uid()) AND (company_members.is_active = true))))));

DROP POLICY IF EXISTS "delivery_drivers_delete" ON public."delivery_drivers";
CREATE POLICY "delivery_drivers_delete" ON public."delivery_drivers" FOR DELETE TO authenticated USING (((company_id IN ( SELECT companies.id FROM companies WHERE (companies.owner_id = auth.uid()))) OR (company_id IN ( SELECT company_members.company_id FROM company_members WHERE ((company_members.user_id = auth.uid()) AND (company_members.is_active = true))))));

DROP POLICY IF EXISTS "delivery_orders_select" ON public."delivery_orders";
CREATE POLICY "delivery_orders_select" ON public."delivery_orders" FOR SELECT TO authenticated USING (((company_id IN ( SELECT companies.id FROM companies WHERE (companies.owner_id = auth.uid()))) OR (company_id IN ( SELECT company_members.company_id FROM company_members WHERE ((company_members.user_id = auth.uid()) AND (company_members.is_active = true))))));

DROP POLICY IF EXISTS "delivery_orders_insert" ON public."delivery_orders";
CREATE POLICY "delivery_orders_insert" ON public."delivery_orders" FOR INSERT TO authenticated WITH CHECK (((company_id IN ( SELECT companies.id FROM companies WHERE (companies.owner_id = auth.uid()))) OR (company_id IN ( SELECT company_members.company_id FROM company_members WHERE ((company_members.user_id = auth.uid()) AND (company_members.is_active = true))))));

DROP POLICY IF EXISTS "delivery_orders_update" ON public."delivery_orders";
CREATE POLICY "delivery_orders_update" ON public."delivery_orders" FOR UPDATE TO authenticated USING (((company_id IN ( SELECT companies.id FROM companies WHERE (companies.owner_id = auth.uid()))) OR (company_id IN ( SELECT company_members.company_id FROM company_members WHERE ((company_members.user_id = auth.uid()) AND (company_members.is_active = true))))));

DROP POLICY IF EXISTS "delivery_orders_delete" ON public."delivery_orders";
CREATE POLICY "delivery_orders_delete" ON public."delivery_orders" FOR DELETE TO authenticated USING (((company_id IN ( SELECT companies.id FROM companies WHERE (companies.owner_id = auth.uid()))) OR (company_id IN ( SELECT company_members.company_id FROM company_members WHERE ((company_members.user_id = auth.uid()) AND (company_members.is_active = true))))));

DROP POLICY IF EXISTS "Company access doctors" ON public."doctors";
CREATE POLICY "Company access doctors" ON public."doctors" FOR ALL USING ((company_id IN ( SELECT company_members.company_id FROM company_members WHERE ((company_members.user_id = auth.uid()) AND (company_members.is_active = true)) UNION SELECT companies.id FROM companies WHERE (companies.owner_id = auth.uid()))));

DROP POLICY IF EXISTS "Anyone can view feature flags" ON public."feature_flags";
CREATE POLICY "Anyone can view feature flags" ON public."feature_flags" FOR SELECT USING (true);

DROP POLICY IF EXISTS "Owners can manage feature flags" ON public."feature_flags";
CREATE POLICY "Owners can manage feature flags" ON public."feature_flags" FOR ALL USING (has_role(auth.uid(), 'owner'::app_role));

DROP POLICY IF EXISTS "Company members can view fiscal periods" ON public."fiscal_periods";
CREATE POLICY "Company members can view fiscal periods" ON public."fiscal_periods" FOR SELECT USING (is_company_member(company_id));

DROP POLICY IF EXISTS "Company members can manage fiscal periods" ON public."fiscal_periods";
CREATE POLICY "Company members can manage fiscal periods" ON public."fiscal_periods" FOR ALL USING (is_company_member(company_id));

DROP POLICY IF EXISTS "Company members can view fiscal audit logs" ON public."fiscal_year_audit_log";
CREATE POLICY "Company members can view fiscal audit logs" ON public."fiscal_year_audit_log" FOR SELECT TO authenticated USING ((company_id IN ( SELECT companies.id FROM companies WHERE (companies.owner_id = auth.uid()) UNION SELECT company_members.company_id FROM company_members WHERE ((company_members.user_id = auth.uid()) AND (company_members.is_active = true)))));

DROP POLICY IF EXISTS "Company members can insert fiscal audit logs" ON public."fiscal_year_audit_log";
CREATE POLICY "Company members can insert fiscal audit logs" ON public."fiscal_year_audit_log" FOR INSERT TO authenticated WITH CHECK ((company_id IN ( SELECT companies.id FROM companies WHERE (companies.owner_id = auth.uid()) UNION SELECT company_members.company_id FROM company_members WHERE ((company_members.user_id = auth.uid()) AND (company_members.is_active = true)))));

DROP POLICY IF EXISTS "Users can manage own company fixed asset account settings" ON public."fixed_asset_account_settings";
CREATE POLICY "Users can manage own company fixed asset account settings" ON public."fixed_asset_account_settings" FOR ALL TO authenticated USING ((company_id IN ( SELECT companies.id FROM companies WHERE (companies.owner_id = auth.uid()) UNION SELECT company_members.company_id FROM company_members WHERE ((company_members.user_id = auth.uid()) AND (company_members.is_active = true)))));

DROP POLICY IF EXISTS "Users can manage own company fixed assets" ON public."fixed_assets";
CREATE POLICY "Users can manage own company fixed assets" ON public."fixed_assets" FOR ALL TO authenticated USING ((company_id IN ( SELECT companies.id FROM companies WHERE (companies.owner_id = auth.uid()) UNION SELECT company_members.company_id FROM company_members WHERE ((company_members.user_id = auth.uid()) AND (company_members.is_active = true)))));

DROP POLICY IF EXISTS "fuel_customers_company" ON public."fuel_customers";
CREATE POLICY "fuel_customers_company" ON public."fuel_customers" FOR ALL TO authenticated USING ((company_id IN ( SELECT company_members.company_id FROM company_members WHERE (company_members.user_id = auth.uid()))));

DROP POLICY IF EXISTS "fuel_message_logs_company" ON public."fuel_message_logs";
CREATE POLICY "fuel_message_logs_company" ON public."fuel_message_logs" FOR ALL TO authenticated USING ((company_id IN ( SELECT company_members.company_id FROM company_members WHERE (company_members.user_id = auth.uid()))));

DROP POLICY IF EXISTS "fuel_prices_company" ON public."fuel_prices";
CREATE POLICY "fuel_prices_company" ON public."fuel_prices" FOR ALL TO authenticated USING ((company_id IN ( SELECT company_members.company_id FROM company_members WHERE (company_members.user_id = auth.uid()))));

DROP POLICY IF EXISTS "fuel_pumps_company" ON public."fuel_pumps";
CREATE POLICY "fuel_pumps_company" ON public."fuel_pumps" FOR ALL TO authenticated USING ((company_id IN ( SELECT company_members.company_id FROM company_members WHERE (company_members.user_id = auth.uid()))));

DROP POLICY IF EXISTS "fuel_sales_company" ON public."fuel_sales";
CREATE POLICY "fuel_sales_company" ON public."fuel_sales" FOR ALL TO authenticated USING ((company_id IN ( SELECT company_members.company_id FROM company_members WHERE (company_members.user_id = auth.uid()))));

DROP POLICY IF EXISTS "fuel_acct_settings_company" ON public."fuel_station_account_settings";
CREATE POLICY "fuel_acct_settings_company" ON public."fuel_station_account_settings" FOR ALL TO authenticated USING ((company_id IN ( SELECT company_members.company_id FROM company_members WHERE (company_members.user_id = auth.uid()))));

DROP POLICY IF EXISTS "fuel_tank_refills_company" ON public."fuel_tank_refills";
CREATE POLICY "fuel_tank_refills_company" ON public."fuel_tank_refills" FOR ALL TO authenticated USING ((company_id IN ( SELECT company_members.company_id FROM company_members WHERE (company_members.user_id = auth.uid()))));

DROP POLICY IF EXISTS "fuel_tanks_company" ON public."fuel_tanks";
CREATE POLICY "fuel_tanks_company" ON public."fuel_tanks" FOR ALL TO authenticated USING ((company_id IN ( SELECT company_members.company_id FROM company_members WHERE (company_members.user_id = auth.uid()))));

DROP POLICY IF EXISTS "fuel_wallet_txns_company" ON public."fuel_wallet_transactions";
CREATE POLICY "fuel_wallet_txns_company" ON public."fuel_wallet_transactions" FOR ALL TO authenticated USING ((company_id IN ( SELECT company_members.company_id FROM company_members WHERE (company_members.user_id = auth.uid()))));

DROP POLICY IF EXISTS "fuel_wallets_company" ON public."fuel_wallets";
CREATE POLICY "fuel_wallets_company" ON public."fuel_wallets" FOR ALL TO authenticated USING ((company_id IN ( SELECT company_members.company_id FROM company_members WHERE (company_members.user_id = auth.uid()))));

DROP POLICY IF EXISTS "Anyone can view global accounts" ON public."global_accounts";
CREATE POLICY "Anyone can view global accounts" ON public."global_accounts" FOR SELECT USING (true);

DROP POLICY IF EXISTS "Owners can manage global accounts" ON public."global_accounts";
CREATE POLICY "Owners can manage global accounts" ON public."global_accounts" FOR ALL USING (has_role(auth.uid(), 'owner'::app_role));

DROP POLICY IF EXISTS "gold_account_settings_select" ON public."gold_account_settings";
CREATE POLICY "gold_account_settings_select" ON public."gold_account_settings" FOR SELECT TO authenticated USING (((company_id IN ( SELECT companies.id FROM companies WHERE (companies.owner_id = auth.uid()))) OR (company_id IN ( SELECT company_members.company_id FROM company_members WHERE ((company_members.user_id = auth.uid()) AND (company_members.is_active = true))))));

DROP POLICY IF EXISTS "gold_account_settings_insert" ON public."gold_account_settings";
CREATE POLICY "gold_account_settings_insert" ON public."gold_account_settings" FOR INSERT TO authenticated WITH CHECK ((company_id IN ( SELECT companies.id FROM companies WHERE (companies.owner_id = auth.uid()))));

DROP POLICY IF EXISTS "gold_account_settings_update" ON public."gold_account_settings";
CREATE POLICY "gold_account_settings_update" ON public."gold_account_settings" FOR UPDATE TO authenticated USING ((company_id IN ( SELECT companies.id FROM companies WHERE (companies.owner_id = auth.uid()))));

DROP POLICY IF EXISTS "Company owner can view gold_items" ON public."gold_items";
CREATE POLICY "Company owner can view gold_items" ON public."gold_items" FOR SELECT USING (is_company_owner(company_id));

DROP POLICY IF EXISTS "Company owner can manage gold_items" ON public."gold_items";
CREATE POLICY "Company owner can manage gold_items" ON public."gold_items" FOR ALL USING (is_company_owner(company_id));

DROP POLICY IF EXISTS "Company owner can view gold_price_settings" ON public."gold_price_settings";
CREATE POLICY "Company owner can view gold_price_settings" ON public."gold_price_settings" FOR SELECT USING (is_company_owner(company_id));

DROP POLICY IF EXISTS "Company owner can manage gold_price_settings" ON public."gold_price_settings";
CREATE POLICY "Company owner can manage gold_price_settings" ON public."gold_price_settings" FOR ALL USING (is_company_owner(company_id));

DROP POLICY IF EXISTS "View gold_purchase_invoice_items" ON public."gold_purchase_invoice_items";
CREATE POLICY "View gold_purchase_invoice_items" ON public."gold_purchase_invoice_items" FOR SELECT USING ((EXISTS ( SELECT 1 FROM gold_purchase_invoices gpi WHERE ((gpi.id = gold_purchase_invoice_items.invoice_id) AND is_company_owner(gpi.company_id)))));

DROP POLICY IF EXISTS "Manage gold_purchase_invoice_items" ON public."gold_purchase_invoice_items";
CREATE POLICY "Manage gold_purchase_invoice_items" ON public."gold_purchase_invoice_items" FOR ALL USING ((EXISTS ( SELECT 1 FROM gold_purchase_invoices gpi WHERE ((gpi.id = gold_purchase_invoice_items.invoice_id) AND is_company_owner(gpi.company_id)))));

DROP POLICY IF EXISTS "Company owner can view gold_purchase_invoices" ON public."gold_purchase_invoices";
CREATE POLICY "Company owner can view gold_purchase_invoices" ON public."gold_purchase_invoices" FOR SELECT USING (is_company_owner(company_id));

DROP POLICY IF EXISTS "Company owner can manage gold_purchase_invoices" ON public."gold_purchase_invoices";
CREATE POLICY "Company owner can manage gold_purchase_invoices" ON public."gold_purchase_invoices" FOR ALL USING (is_company_owner(company_id));

DROP POLICY IF EXISTS "View gold_sales_invoice_items" ON public."gold_sales_invoice_items";
CREATE POLICY "View gold_sales_invoice_items" ON public."gold_sales_invoice_items" FOR SELECT USING ((EXISTS ( SELECT 1 FROM gold_sales_invoices gsi WHERE ((gsi.id = gold_sales_invoice_items.invoice_id) AND is_company_owner(gsi.company_id)))));

DROP POLICY IF EXISTS "Manage gold_sales_invoice_items" ON public."gold_sales_invoice_items";
CREATE POLICY "Manage gold_sales_invoice_items" ON public."gold_sales_invoice_items" FOR ALL USING ((EXISTS ( SELECT 1 FROM gold_sales_invoices gsi WHERE ((gsi.id = gold_sales_invoice_items.invoice_id) AND is_company_owner(gsi.company_id)))));

DROP POLICY IF EXISTS "Company owner can view gold_sales_invoices" ON public."gold_sales_invoices";
CREATE POLICY "Company owner can view gold_sales_invoices" ON public."gold_sales_invoices" FOR SELECT USING (is_company_owner(company_id));

DROP POLICY IF EXISTS "Company owner can manage gold_sales_invoices" ON public."gold_sales_invoices";
CREATE POLICY "Company owner can manage gold_sales_invoices" ON public."gold_sales_invoices" FOR ALL USING (is_company_owner(company_id));

DROP POLICY IF EXISTS "Users can view their company hr_account_settings" ON public."hr_account_settings";
CREATE POLICY "Users can view their company hr_account_settings" ON public."hr_account_settings" FOR SELECT TO authenticated USING (((company_id IN ( SELECT companies.id FROM companies WHERE (companies.owner_id = auth.uid()))) OR (company_id IN ( SELECT company_members.company_id FROM company_members WHERE ((company_members.user_id = auth.uid()) AND (company_members.is_active = true))))));

DROP POLICY IF EXISTS "Users can insert their company hr_account_settings" ON public."hr_account_settings";
CREATE POLICY "Users can insert their company hr_account_settings" ON public."hr_account_settings" FOR INSERT TO authenticated WITH CHECK ((company_id IN ( SELECT companies.id FROM companies WHERE (companies.owner_id = auth.uid()))));

DROP POLICY IF EXISTS "Users can update their company hr_account_settings" ON public."hr_account_settings";
CREATE POLICY "Users can update their company hr_account_settings" ON public."hr_account_settings" FOR UPDATE TO authenticated USING ((company_id IN ( SELECT companies.id FROM companies WHERE (companies.owner_id = auth.uid()))));

DROP POLICY IF EXISTS "Company owner can view hr_attendance" ON public."hr_attendance";
CREATE POLICY "Company owner can view hr_attendance" ON public."hr_attendance" FOR SELECT USING (is_company_owner(company_id));

DROP POLICY IF EXISTS "Company owner can manage hr_attendance" ON public."hr_attendance";
CREATE POLICY "Company owner can manage hr_attendance" ON public."hr_attendance" FOR ALL USING (is_company_owner(company_id));

DROP POLICY IF EXISTS "Users can view deductions for their company" ON public."hr_deductions";
CREATE POLICY "Users can view deductions for their company" ON public."hr_deductions" FOR SELECT TO authenticated USING ((company_id IN ( SELECT company_members.company_id FROM company_members WHERE ((company_members.user_id = auth.uid()) AND (company_members.is_active = true)))));

DROP POLICY IF EXISTS "Users can insert deductions for their company" ON public."hr_deductions";
CREATE POLICY "Users can insert deductions for their company" ON public."hr_deductions" FOR INSERT TO authenticated WITH CHECK ((company_id IN ( SELECT company_members.company_id FROM company_members WHERE ((company_members.user_id = auth.uid()) AND (company_members.is_active = true)))));

DROP POLICY IF EXISTS "Users can update deductions for their company" ON public."hr_deductions";
CREATE POLICY "Users can update deductions for their company" ON public."hr_deductions" FOR UPDATE TO authenticated USING ((company_id IN ( SELECT company_members.company_id FROM company_members WHERE ((company_members.user_id = auth.uid()) AND (company_members.is_active = true)))));

DROP POLICY IF EXISTS "Users can delete deductions for their company" ON public."hr_deductions";
CREATE POLICY "Users can delete deductions for their company" ON public."hr_deductions" FOR DELETE TO authenticated USING ((company_id IN ( SELECT company_members.company_id FROM company_members WHERE ((company_members.user_id = auth.uid()) AND (company_members.is_active = true)))));

DROP POLICY IF EXISTS "Company owner can view hr_departments" ON public."hr_departments";
CREATE POLICY "Company owner can view hr_departments" ON public."hr_departments" FOR SELECT USING (is_company_owner(company_id));

DROP POLICY IF EXISTS "Company owner can manage hr_departments" ON public."hr_departments";
CREATE POLICY "Company owner can manage hr_departments" ON public."hr_departments" FOR ALL USING (is_company_owner(company_id));

DROP POLICY IF EXISTS "Company owner can view hr_employees" ON public."hr_employees";
CREATE POLICY "Company owner can view hr_employees" ON public."hr_employees" FOR SELECT USING (is_company_owner(company_id));

DROP POLICY IF EXISTS "Company owner can manage hr_employees" ON public."hr_employees";
CREATE POLICY "Company owner can manage hr_employees" ON public."hr_employees" FOR ALL USING (is_company_owner(company_id));

DROP POLICY IF EXISTS "Users can view leave balances for their company" ON public."hr_leave_balances";
CREATE POLICY "Users can view leave balances for their company" ON public."hr_leave_balances" FOR SELECT TO authenticated USING ((company_id IN ( SELECT company_members.company_id FROM company_members WHERE ((company_members.user_id = auth.uid()) AND (company_members.is_active = true)))));

DROP POLICY IF EXISTS "Users can insert leave balances for their company" ON public."hr_leave_balances";
CREATE POLICY "Users can insert leave balances for their company" ON public."hr_leave_balances" FOR INSERT TO authenticated WITH CHECK ((company_id IN ( SELECT company_members.company_id FROM company_members WHERE ((company_members.user_id = auth.uid()) AND (company_members.is_active = true)))));

DROP POLICY IF EXISTS "Users can update leave balances for their company" ON public."hr_leave_balances";
CREATE POLICY "Users can update leave balances for their company" ON public."hr_leave_balances" FOR UPDATE TO authenticated USING ((company_id IN ( SELECT company_members.company_id FROM company_members WHERE ((company_members.user_id = auth.uid()) AND (company_members.is_active = true)))));

DROP POLICY IF EXISTS "Users can delete leave balances for their company" ON public."hr_leave_balances";
CREATE POLICY "Users can delete leave balances for their company" ON public."hr_leave_balances" FOR DELETE TO authenticated USING ((company_id IN ( SELECT company_members.company_id FROM company_members WHERE ((company_members.user_id = auth.uid()) AND (company_members.is_active = true)))));

DROP POLICY IF EXISTS "Users can view leave policies for their company" ON public."hr_leave_policies";
CREATE POLICY "Users can view leave policies for their company" ON public."hr_leave_policies" FOR SELECT TO authenticated USING ((company_id IN ( SELECT company_members.company_id FROM company_members WHERE ((company_members.user_id = auth.uid()) AND (company_members.is_active = true)))));

DROP POLICY IF EXISTS "Users can insert leave policies for their company" ON public."hr_leave_policies";
CREATE POLICY "Users can insert leave policies for their company" ON public."hr_leave_policies" FOR INSERT TO authenticated WITH CHECK ((company_id IN ( SELECT company_members.company_id FROM company_members WHERE ((company_members.user_id = auth.uid()) AND (company_members.is_active = true)))));

DROP POLICY IF EXISTS "Users can update leave policies for their company" ON public."hr_leave_policies";
CREATE POLICY "Users can update leave policies for their company" ON public."hr_leave_policies" FOR UPDATE TO authenticated USING ((company_id IN ( SELECT company_members.company_id FROM company_members WHERE ((company_members.user_id = auth.uid()) AND (company_members.is_active = true)))));

DROP POLICY IF EXISTS "Users can delete leave policies for their company" ON public."hr_leave_policies";
CREATE POLICY "Users can delete leave policies for their company" ON public."hr_leave_policies" FOR DELETE TO authenticated USING ((company_id IN ( SELECT company_members.company_id FROM company_members WHERE ((company_members.user_id = auth.uid()) AND (company_members.is_active = true)))));

DROP POLICY IF EXISTS "Company owner can view hr_leaves" ON public."hr_leaves";
CREATE POLICY "Company owner can view hr_leaves" ON public."hr_leaves" FOR SELECT USING (is_company_owner(company_id));

DROP POLICY IF EXISTS "Company owner can manage hr_leaves" ON public."hr_leaves";
CREATE POLICY "Company owner can manage hr_leaves" ON public."hr_leaves" FOR ALL USING (is_company_owner(company_id));

DROP POLICY IF EXISTS "Company owner can view hr_loans" ON public."hr_loans";
CREATE POLICY "Company owner can view hr_loans" ON public."hr_loans" FOR SELECT USING (is_company_owner(company_id));

DROP POLICY IF EXISTS "Company owner can manage hr_loans" ON public."hr_loans";
CREATE POLICY "Company owner can manage hr_loans" ON public."hr_loans" FOR ALL USING (is_company_owner(company_id));

DROP POLICY IF EXISTS "Company owner can view hr_payroll_items" ON public."hr_payroll_items";
CREATE POLICY "Company owner can view hr_payroll_items" ON public."hr_payroll_items" FOR SELECT USING ((EXISTS ( SELECT 1 FROM hr_payroll_runs pr WHERE ((pr.id = hr_payroll_items.payroll_run_id) AND is_company_owner(pr.company_id)))));

DROP POLICY IF EXISTS "Company owner can manage hr_payroll_items" ON public."hr_payroll_items";
CREATE POLICY "Company owner can manage hr_payroll_items" ON public."hr_payroll_items" FOR ALL USING ((EXISTS ( SELECT 1 FROM hr_payroll_runs pr WHERE ((pr.id = hr_payroll_items.payroll_run_id) AND is_company_owner(pr.company_id)))));

DROP POLICY IF EXISTS "Users can view payment items" ON public."hr_payroll_payment_items";
CREATE POLICY "Users can view payment items" ON public."hr_payroll_payment_items" FOR SELECT TO authenticated USING ((payment_id IN ( SELECT hr_payroll_payments.id FROM hr_payroll_payments WHERE ((hr_payroll_payments.company_id IN ( SELECT companies.id FROM companies WHERE (companies.owner_id = auth.uid()))) OR (hr_payroll_payments.company_id IN ( SELECT company_members.company_id FROM company_members WHERE ((company_members.user_id = auth.uid()) AND (company_members.is_active = true))))))));

DROP POLICY IF EXISTS "Users can insert payment items" ON public."hr_payroll_payment_items";
CREATE POLICY "Users can insert payment items" ON public."hr_payroll_payment_items" FOR INSERT TO authenticated WITH CHECK ((payment_id IN ( SELECT hr_payroll_payments.id FROM hr_payroll_payments WHERE ((hr_payroll_payments.company_id IN ( SELECT companies.id FROM companies WHERE (companies.owner_id = auth.uid()))) OR (hr_payroll_payments.company_id IN ( SELECT company_members.company_id FROM company_members WHERE ((company_members.user_id = auth.uid()) AND (company_members.is_active = true))))))));

DROP POLICY IF EXISTS "Users can delete payment items" ON public."hr_payroll_payment_items";
CREATE POLICY "Users can delete payment items" ON public."hr_payroll_payment_items" FOR DELETE TO authenticated USING ((payment_id IN ( SELECT hr_payroll_payments.id FROM hr_payroll_payments WHERE ((hr_payroll_payments.company_id IN ( SELECT companies.id FROM companies WHERE (companies.owner_id = auth.uid()))) OR (hr_payroll_payments.company_id IN ( SELECT company_members.company_id FROM company_members WHERE ((company_members.user_id = auth.uid()) AND (company_members.is_active = true))))))));

DROP POLICY IF EXISTS "Users can view payroll payments for their company" ON public."hr_payroll_payments";
CREATE POLICY "Users can view payroll payments for their company" ON public."hr_payroll_payments" FOR SELECT TO authenticated USING (((company_id IN ( SELECT companies.id FROM companies WHERE (companies.owner_id = auth.uid()))) OR (company_id IN ( SELECT company_members.company_id FROM company_members WHERE ((company_members.user_id = auth.uid()) AND (company_members.is_active = true))))));

DROP POLICY IF EXISTS "Users can insert payroll payments for their company" ON public."hr_payroll_payments";
CREATE POLICY "Users can insert payroll payments for their company" ON public."hr_payroll_payments" FOR INSERT TO authenticated WITH CHECK (((company_id IN ( SELECT companies.id FROM companies WHERE (companies.owner_id = auth.uid()))) OR (company_id IN ( SELECT company_members.company_id FROM company_members WHERE ((company_members.user_id = auth.uid()) AND (company_members.is_active = true))))));

DROP POLICY IF EXISTS "Users can update payroll payments for their company" ON public."hr_payroll_payments";
CREATE POLICY "Users can update payroll payments for their company" ON public."hr_payroll_payments" FOR UPDATE TO authenticated USING (((company_id IN ( SELECT companies.id FROM companies WHERE (companies.owner_id = auth.uid()))) OR (company_id IN ( SELECT company_members.company_id FROM company_members WHERE ((company_members.user_id = auth.uid()) AND (company_members.is_active = true))))));

DROP POLICY IF EXISTS "Users can delete payroll payments for their company" ON public."hr_payroll_payments";
CREATE POLICY "Users can delete payroll payments for their company" ON public."hr_payroll_payments" FOR DELETE TO authenticated USING (((company_id IN ( SELECT companies.id FROM companies WHERE (companies.owner_id = auth.uid()))) OR (company_id IN ( SELECT company_members.company_id FROM company_members WHERE ((company_members.user_id = auth.uid()) AND (company_members.is_active = true))))));

DROP POLICY IF EXISTS "Company owner can view hr_payroll_runs" ON public."hr_payroll_runs";
CREATE POLICY "Company owner can view hr_payroll_runs" ON public."hr_payroll_runs" FOR SELECT USING (is_company_owner(company_id));

DROP POLICY IF EXISTS "Company owner can manage hr_payroll_runs" ON public."hr_payroll_runs";
CREATE POLICY "Company owner can manage hr_payroll_runs" ON public."hr_payroll_runs" FOR ALL USING (is_company_owner(company_id));

DROP POLICY IF EXISTS "Users can view penalty rules for their company" ON public."hr_penalty_rules";
CREATE POLICY "Users can view penalty rules for their company" ON public."hr_penalty_rules" FOR SELECT TO authenticated USING ((company_id IN ( SELECT company_members.company_id FROM company_members WHERE ((company_members.user_id = auth.uid()) AND (company_members.is_active = true)))));

DROP POLICY IF EXISTS "Users can insert penalty rules for their company" ON public."hr_penalty_rules";
CREATE POLICY "Users can insert penalty rules for their company" ON public."hr_penalty_rules" FOR INSERT TO authenticated WITH CHECK ((company_id IN ( SELECT company_members.company_id FROM company_members WHERE ((company_members.user_id = auth.uid()) AND (company_members.is_active = true)))));

DROP POLICY IF EXISTS "Users can update penalty rules for their company" ON public."hr_penalty_rules";
CREATE POLICY "Users can update penalty rules for their company" ON public."hr_penalty_rules" FOR UPDATE TO authenticated USING ((company_id IN ( SELECT company_members.company_id FROM company_members WHERE ((company_members.user_id = auth.uid()) AND (company_members.is_active = true)))));

DROP POLICY IF EXISTS "Users can delete penalty rules for their company" ON public."hr_penalty_rules";
CREATE POLICY "Users can delete penalty rules for their company" ON public."hr_penalty_rules" FOR DELETE TO authenticated USING ((company_id IN ( SELECT company_members.company_id FROM company_members WHERE ((company_members.user_id = auth.uid()) AND (company_members.is_active = true)))));

DROP POLICY IF EXISTS "Users can view work shifts for their company" ON public."hr_work_shifts";
CREATE POLICY "Users can view work shifts for their company" ON public."hr_work_shifts" FOR SELECT TO authenticated USING ((company_id IN ( SELECT company_members.company_id FROM company_members WHERE ((company_members.user_id = auth.uid()) AND (company_members.is_active = true)))));

DROP POLICY IF EXISTS "Users can insert work shifts for their company" ON public."hr_work_shifts";
CREATE POLICY "Users can insert work shifts for their company" ON public."hr_work_shifts" FOR INSERT TO authenticated WITH CHECK ((company_id IN ( SELECT company_members.company_id FROM company_members WHERE ((company_members.user_id = auth.uid()) AND (company_members.is_active = true)))));

DROP POLICY IF EXISTS "Users can update work shifts for their company" ON public."hr_work_shifts";
CREATE POLICY "Users can update work shifts for their company" ON public."hr_work_shifts" FOR UPDATE TO authenticated USING ((company_id IN ( SELECT company_members.company_id FROM company_members WHERE ((company_members.user_id = auth.uid()) AND (company_members.is_active = true)))));

DROP POLICY IF EXISTS "Users can delete work shifts for their company" ON public."hr_work_shifts";
CREATE POLICY "Users can delete work shifts for their company" ON public."hr_work_shifts" FOR DELETE TO authenticated USING ((company_id IN ( SELECT company_members.company_id FROM company_members WHERE ((company_members.user_id = auth.uid()) AND (company_members.is_active = true)))));

DROP POLICY IF EXISTS "View internal_consumption_items" ON public."internal_consumption_items";
CREATE POLICY "View internal_consumption_items" ON public."internal_consumption_items" FOR SELECT USING ((EXISTS ( SELECT 1 FROM internal_consumptions ic WHERE ((ic.id = internal_consumption_items.consumption_id) AND is_company_owner(ic.company_id)))));

DROP POLICY IF EXISTS "Manage internal_consumption_items" ON public."internal_consumption_items";
CREATE POLICY "Manage internal_consumption_items" ON public."internal_consumption_items" FOR ALL USING ((EXISTS ( SELECT 1 FROM internal_consumptions ic WHERE ((ic.id = internal_consumption_items.consumption_id) AND is_company_owner(ic.company_id)))));

DROP POLICY IF EXISTS "Company owner can view internal_consumptions" ON public."internal_consumptions";
CREATE POLICY "Company owner can view internal_consumptions" ON public."internal_consumptions" FOR SELECT USING (is_company_owner(company_id));

DROP POLICY IF EXISTS "Company owner can manage internal_consumptions" ON public."internal_consumptions";
CREATE POLICY "Company owner can manage internal_consumptions" ON public."internal_consumptions" FOR ALL USING (is_company_owner(company_id));

DROP POLICY IF EXISTS "Anyone can insert invitations via service" ON public."invitations";
CREATE POLICY "Anyone can insert invitations via service" ON public."invitations" FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Company owner can manage invitations" ON public."invitations";
CREATE POLICY "Company owner can manage invitations" ON public."invitations" FOR ALL USING (is_company_owner(company_id));

DROP POLICY IF EXISTS "Company members can view invoice items" ON public."invoice_items";
CREATE POLICY "Company members can view invoice items" ON public."invoice_items" FOR SELECT USING ((EXISTS ( SELECT 1 FROM invoices i WHERE ((i.id = invoice_items.invoice_id) AND is_company_member(i.company_id)))));

DROP POLICY IF EXISTS "Company members can manage invoice items" ON public."invoice_items";
CREATE POLICY "Company members can manage invoice items" ON public."invoice_items" FOR ALL USING ((EXISTS ( SELECT 1 FROM invoices i WHERE ((i.id = invoice_items.invoice_id) AND is_company_member(i.company_id)))));

DROP POLICY IF EXISTS "Company members can view invoice payments" ON public."invoice_payments";
CREATE POLICY "Company members can view invoice payments" ON public."invoice_payments" FOR SELECT USING (is_company_member(company_id));

DROP POLICY IF EXISTS "Company members can manage invoice payments" ON public."invoice_payments";
CREATE POLICY "Company members can manage invoice payments" ON public."invoice_payments" FOR ALL USING (is_company_member(company_id));

DROP POLICY IF EXISTS "Company members can view invoices" ON public."invoices";
CREATE POLICY "Company members can view invoices" ON public."invoices" FOR SELECT USING (is_company_member(company_id));

DROP POLICY IF EXISTS "Company members can manage invoices" ON public."invoices";
CREATE POLICY "Company members can manage invoices" ON public."invoices" FOR ALL USING (is_company_member(company_id));

DROP POLICY IF EXISTS "Company members can view journal entries" ON public."journal_entries";
CREATE POLICY "Company members can view journal entries" ON public."journal_entries" FOR SELECT USING (is_company_member(company_id));

DROP POLICY IF EXISTS "Company members can manage journal entries" ON public."journal_entries";
CREATE POLICY "Company members can manage journal entries" ON public."journal_entries" FOR ALL USING (is_company_member(company_id));

DROP POLICY IF EXISTS "Company members can view entry lines" ON public."journal_entry_lines";
CREATE POLICY "Company members can view entry lines" ON public."journal_entry_lines" FOR SELECT USING ((EXISTS ( SELECT 1 FROM journal_entries je WHERE ((je.id = journal_entry_lines.entry_id) AND is_company_member(je.company_id)))));

DROP POLICY IF EXISTS "Company members can manage entry lines" ON public."journal_entry_lines";
CREATE POLICY "Company members can manage entry lines" ON public."journal_entry_lines" FOR ALL USING ((EXISTS ( SELECT 1 FROM journal_entries je WHERE ((je.id = journal_entry_lines.entry_id) AND is_company_member(je.company_id)))));

DROP POLICY IF EXISTS "Anyone can view active FAQ" ON public."landing_faq";
CREATE POLICY "Anyone can view active FAQ" ON public."landing_faq" FOR SELECT USING ((is_active = true));

DROP POLICY IF EXISTS "Owners can manage FAQ" ON public."landing_faq";
CREATE POLICY "Owners can manage FAQ" ON public."landing_faq" FOR ALL USING (has_role(auth.uid(), 'owner'::app_role));

DROP POLICY IF EXISTS "Anyone can view active features" ON public."landing_features";
CREATE POLICY "Anyone can view active features" ON public."landing_features" FOR SELECT USING ((is_active = true));

DROP POLICY IF EXISTS "Owners can manage features" ON public."landing_features";
CREATE POLICY "Owners can manage features" ON public."landing_features" FOR ALL USING (has_role(auth.uid(), 'owner'::app_role));

DROP POLICY IF EXISTS "Anyone can view active hero" ON public."landing_hero";
CREATE POLICY "Anyone can view active hero" ON public."landing_hero" FOR SELECT USING ((is_active = true));

DROP POLICY IF EXISTS "Owners can manage hero" ON public."landing_hero";
CREATE POLICY "Owners can manage hero" ON public."landing_hero" FOR ALL USING (has_role(auth.uid(), 'owner'::app_role));

DROP POLICY IF EXISTS "Company owner can view manufacturing_orders" ON public."manufacturing_orders";
CREATE POLICY "Company owner can view manufacturing_orders" ON public."manufacturing_orders" FOR SELECT USING (is_company_owner(company_id));

DROP POLICY IF EXISTS "Company owner can manage manufacturing_orders" ON public."manufacturing_orders";
CREATE POLICY "Company owner can manage manufacturing_orders" ON public."manufacturing_orders" FOR ALL USING (is_company_owner(company_id));

DROP POLICY IF EXISTS "Company owner can view opening balances" ON public."opening_balances";
CREATE POLICY "Company owner can view opening balances" ON public."opening_balances" FOR SELECT USING (is_company_owner(company_id));

DROP POLICY IF EXISTS "Company owner can manage opening balances" ON public."opening_balances";
CREATE POLICY "Company owner can manage opening balances" ON public."opening_balances" FOR ALL USING (is_company_owner(company_id));

DROP POLICY IF EXISTS "Anyone can view public settings" ON public."owner_settings";
CREATE POLICY "Anyone can view public settings" ON public."owner_settings" FOR SELECT USING ((setting_key = ANY (ARRAY['bank_account'::text, 'payment_settings'::text])));

DROP POLICY IF EXISTS "Owners can view settings" ON public."owner_settings";
CREATE POLICY "Owners can view settings" ON public."owner_settings" FOR SELECT USING (has_role(auth.uid(), 'owner'::app_role));

DROP POLICY IF EXISTS "Owners can manage settings" ON public."owner_settings";
CREATE POLICY "Owners can manage settings" ON public."owner_settings" FOR ALL USING (has_role(auth.uid(), 'owner'::app_role));

DROP POLICY IF EXISTS "Company access patients" ON public."patients";
CREATE POLICY "Company access patients" ON public."patients" FOR ALL USING ((company_id IN ( SELECT company_members.company_id FROM company_members WHERE ((company_members.user_id = auth.uid()) AND (company_members.is_active = true)) UNION SELECT companies.id FROM companies WHERE (companies.owner_id = auth.uid()))));

DROP POLICY IF EXISTS "Company owner can view payment methods" ON public."payment_methods";
CREATE POLICY "Company owner can view payment methods" ON public."payment_methods" FOR SELECT USING (is_company_owner(company_id));

DROP POLICY IF EXISTS "Company owner can manage payment methods" ON public."payment_methods";
CREATE POLICY "Company owner can manage payment methods" ON public."payment_methods" FOR ALL USING (is_company_owner(company_id));

DROP POLICY IF EXISTS "Company members can view payments" ON public."payments";
CREATE POLICY "Company members can view payments" ON public."payments" FOR SELECT USING (is_company_member(company_id));

DROP POLICY IF EXISTS "Platform owner can view all payments" ON public."payments";
CREATE POLICY "Platform owner can view all payments" ON public."payments" FOR SELECT USING ((EXISTS ( SELECT 1 FROM user_roles WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = 'owner'::app_role)))));

DROP POLICY IF EXISTS "Company members can create payments" ON public."payments";
CREATE POLICY "Company members can create payments" ON public."payments" FOR INSERT WITH CHECK (is_company_member(company_id));

DROP POLICY IF EXISTS "Anyone can view plan permissions" ON public."plan_feature_permissions";
CREATE POLICY "Anyone can view plan permissions" ON public."plan_feature_permissions" FOR SELECT USING (true);

DROP POLICY IF EXISTS "Owners can manage plan permissions" ON public."plan_feature_permissions";
CREATE POLICY "Owners can manage plan permissions" ON public."plan_feature_permissions" FOR ALL USING (has_role(auth.uid(), 'owner'::app_role));

DROP POLICY IF EXISTS "Anyone can view plan_permission_bounds" ON public."plan_permission_bounds";
CREATE POLICY "Anyone can view plan_permission_bounds" ON public."plan_permission_bounds" FOR SELECT USING (true);

DROP POLICY IF EXISTS "Owners can manage plan_permission_bounds" ON public."plan_permission_bounds";
CREATE POLICY "Owners can manage plan_permission_bounds" ON public."plan_permission_bounds" FOR ALL USING (has_role(auth.uid(), 'owner'::app_role));

DROP POLICY IF EXISTS "Authenticated users can view plan screens" ON public."plan_screens";
CREATE POLICY "Authenticated users can view plan screens" ON public."plan_screens" FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Owners can manage plan screens" ON public."plan_screens";
CREATE POLICY "Owners can manage plan screens" ON public."plan_screens" FOR ALL USING (has_role(auth.uid(), 'owner'::app_role));

DROP POLICY IF EXISTS "pos_account_settings_select" ON public."pos_account_settings";
CREATE POLICY "pos_account_settings_select" ON public."pos_account_settings" FOR SELECT TO authenticated USING (((company_id IN ( SELECT companies.id FROM companies WHERE (companies.owner_id = auth.uid()))) OR (company_id IN ( SELECT company_members.company_id FROM company_members WHERE ((company_members.user_id = auth.uid()) AND (company_members.is_active = true))))));

DROP POLICY IF EXISTS "pos_account_settings_insert" ON public."pos_account_settings";
CREATE POLICY "pos_account_settings_insert" ON public."pos_account_settings" FOR INSERT TO authenticated WITH CHECK ((company_id IN ( SELECT companies.id FROM companies WHERE (companies.owner_id = auth.uid()))));

DROP POLICY IF EXISTS "pos_account_settings_update" ON public."pos_account_settings";
CREATE POLICY "pos_account_settings_update" ON public."pos_account_settings" FOR UPDATE TO authenticated USING ((company_id IN ( SELECT companies.id FROM companies WHERE (companies.owner_id = auth.uid()))));

DROP POLICY IF EXISTS "Company owner can view pos_activity_log" ON public."pos_activity_log";
CREATE POLICY "Company owner can view pos_activity_log" ON public."pos_activity_log" FOR SELECT USING (is_company_owner(company_id));

DROP POLICY IF EXISTS "Company owner can manage pos_activity_log" ON public."pos_activity_log";
CREATE POLICY "Company owner can manage pos_activity_log" ON public."pos_activity_log" FOR ALL USING (is_company_owner(company_id));

DROP POLICY IF EXISTS "Users can view their company integrations" ON public."pos_api_integrations";
CREATE POLICY "Users can view their company integrations" ON public."pos_api_integrations" FOR SELECT TO authenticated USING ((company_id IN ( SELECT companies.id FROM companies WHERE (companies.owner_id = auth.uid()) UNION SELECT company_members.company_id FROM company_members WHERE ((company_members.user_id = auth.uid()) AND (company_members.is_active = true)))));

DROP POLICY IF EXISTS "Users can insert their company integrations" ON public."pos_api_integrations";
CREATE POLICY "Users can insert their company integrations" ON public."pos_api_integrations" FOR INSERT TO authenticated WITH CHECK ((company_id IN ( SELECT companies.id FROM companies WHERE (companies.owner_id = auth.uid()) UNION SELECT company_members.company_id FROM company_members WHERE ((company_members.user_id = auth.uid()) AND (company_members.is_active = true)))));

DROP POLICY IF EXISTS "Users can update their company integrations" ON public."pos_api_integrations";
CREATE POLICY "Users can update their company integrations" ON public."pos_api_integrations" FOR UPDATE TO authenticated USING ((company_id IN ( SELECT companies.id FROM companies WHERE (companies.owner_id = auth.uid()) UNION SELECT company_members.company_id FROM company_members WHERE ((company_members.user_id = auth.uid()) AND (company_members.is_active = true)))));

DROP POLICY IF EXISTS "Users can delete their company integrations" ON public."pos_api_integrations";
CREATE POLICY "Users can delete their company integrations" ON public."pos_api_integrations" FOR DELETE TO authenticated USING ((company_id IN ( SELECT companies.id FROM companies WHERE (companies.owner_id = auth.uid()) UNION SELECT company_members.company_id FROM company_members WHERE ((company_members.user_id = auth.uid()) AND (company_members.is_active = true)))));

DROP POLICY IF EXISTS "Users can view their company logs" ON public."pos_api_logs";
CREATE POLICY "Users can view their company logs" ON public."pos_api_logs" FOR SELECT TO authenticated USING ((integration_id IN ( SELECT pos_api_integrations.id FROM pos_api_integrations WHERE (pos_api_integrations.company_id IN ( SELECT companies.id FROM companies WHERE (companies.owner_id = auth.uid()) UNION SELECT company_members.company_id FROM company_members WHERE ((company_members.user_id = auth.uid()) AND (company_members.is_active = true)))))));

DROP POLICY IF EXISTS "Webhook can insert logs" ON public."pos_api_logs";
CREATE POLICY "Webhook can insert logs" ON public."pos_api_logs" FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Webhook can insert logs" ON public."pos_api_logs";
CREATE POLICY "Webhook can insert logs" ON public."pos_api_logs" FOR INSERT TO anon WITH CHECK (true);

DROP POLICY IF EXISTS "Users can view their company orders" ON public."pos_api_orders";
CREATE POLICY "Users can view their company orders" ON public."pos_api_orders" FOR SELECT TO authenticated USING ((company_id IN ( SELECT companies.id FROM companies WHERE (companies.owner_id = auth.uid()) UNION SELECT company_members.company_id FROM company_members WHERE ((company_members.user_id = auth.uid()) AND (company_members.is_active = true)))));

DROP POLICY IF EXISTS "Webhook can insert orders" ON public."pos_api_orders";
CREATE POLICY "Webhook can insert orders" ON public."pos_api_orders" FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update their company orders" ON public."pos_api_orders";
CREATE POLICY "Users can update their company orders" ON public."pos_api_orders" FOR UPDATE TO authenticated USING ((company_id IN ( SELECT companies.id FROM companies WHERE (companies.owner_id = auth.uid()) UNION SELECT company_members.company_id FROM company_members WHERE ((company_members.user_id = auth.uid()) AND (company_members.is_active = true)))));

DROP POLICY IF EXISTS "Webhook can insert orders" ON public."pos_api_orders";
CREATE POLICY "Webhook can insert orders" ON public."pos_api_orders" FOR INSERT TO anon WITH CHECK (true);

DROP POLICY IF EXISTS "pos_coupons_select" ON public."pos_coupons";
CREATE POLICY "pos_coupons_select" ON public."pos_coupons" FOR SELECT TO authenticated USING ((company_id IN ( SELECT company_members.company_id FROM company_members WHERE ((company_members.user_id = auth.uid()) AND (company_members.is_active = true)))));

DROP POLICY IF EXISTS "pos_coupons_insert" ON public."pos_coupons";
CREATE POLICY "pos_coupons_insert" ON public."pos_coupons" FOR INSERT TO authenticated WITH CHECK ((company_id IN ( SELECT company_members.company_id FROM company_members WHERE ((company_members.user_id = auth.uid()) AND (company_members.is_active = true)))));

DROP POLICY IF EXISTS "pos_coupons_update" ON public."pos_coupons";
CREATE POLICY "pos_coupons_update" ON public."pos_coupons" FOR UPDATE TO authenticated USING ((company_id IN ( SELECT company_members.company_id FROM company_members WHERE ((company_members.user_id = auth.uid()) AND (company_members.is_active = true)))));

DROP POLICY IF EXISTS "pos_coupons_delete" ON public."pos_coupons";
CREATE POLICY "pos_coupons_delete" ON public."pos_coupons" FOR DELETE TO authenticated USING ((company_id IN ( SELECT company_members.company_id FROM company_members WHERE ((company_members.user_id = auth.uid()) AND (company_members.is_active = true)))));

DROP POLICY IF EXISTS "View pos_menu_items" ON public."pos_menu_items";
CREATE POLICY "View pos_menu_items" ON public."pos_menu_items" FOR SELECT USING ((EXISTS ( SELECT 1 FROM pos_menus pm WHERE ((pm.id = pos_menu_items.menu_id) AND is_company_owner(pm.company_id)))));

DROP POLICY IF EXISTS "Manage pos_menu_items" ON public."pos_menu_items";
CREATE POLICY "Manage pos_menu_items" ON public."pos_menu_items" FOR ALL USING ((EXISTS ( SELECT 1 FROM pos_menus pm WHERE ((pm.id = pos_menu_items.menu_id) AND is_company_owner(pm.company_id)))));

DROP POLICY IF EXISTS "Users can view menu prices for their company" ON public."pos_menu_prices";
CREATE POLICY "Users can view menu prices for their company" ON public."pos_menu_prices" FOR SELECT TO authenticated USING (((company_id IN ( SELECT company_members.company_id FROM company_members WHERE (company_members.user_id = auth.uid()))) OR (company_id IN ( SELECT companies.id FROM companies WHERE (companies.owner_id = auth.uid())))));

DROP POLICY IF EXISTS "Users can manage menu prices for their company" ON public."pos_menu_prices";
CREATE POLICY "Users can manage menu prices for their company" ON public."pos_menu_prices" FOR ALL TO authenticated USING (((company_id IN ( SELECT company_members.company_id FROM company_members WHERE (company_members.user_id = auth.uid()))) OR (company_id IN ( SELECT companies.id FROM companies WHERE (companies.owner_id = auth.uid())))));

DROP POLICY IF EXISTS "Company owner can view pos_menus" ON public."pos_menus";
CREATE POLICY "Company owner can view pos_menus" ON public."pos_menus" FOR SELECT USING (is_company_owner(company_id));

DROP POLICY IF EXISTS "Company owner can manage pos_menus" ON public."pos_menus";
CREATE POLICY "Company owner can manage pos_menus" ON public."pos_menus" FOR ALL USING (is_company_owner(company_id));

DROP POLICY IF EXISTS "pos_promo_products_select" ON public."pos_promotion_products";
CREATE POLICY "pos_promo_products_select" ON public."pos_promotion_products" FOR SELECT TO authenticated USING ((company_id IN ( SELECT company_members.company_id FROM company_members WHERE ((company_members.user_id = auth.uid()) AND (company_members.is_active = true)))));

DROP POLICY IF EXISTS "pos_promo_products_insert" ON public."pos_promotion_products";
CREATE POLICY "pos_promo_products_insert" ON public."pos_promotion_products" FOR INSERT TO authenticated WITH CHECK ((company_id IN ( SELECT company_members.company_id FROM company_members WHERE ((company_members.user_id = auth.uid()) AND (company_members.is_active = true)))));

DROP POLICY IF EXISTS "pos_promo_products_update" ON public."pos_promotion_products";
CREATE POLICY "pos_promo_products_update" ON public."pos_promotion_products" FOR UPDATE TO authenticated USING ((company_id IN ( SELECT company_members.company_id FROM company_members WHERE ((company_members.user_id = auth.uid()) AND (company_members.is_active = true)))));

DROP POLICY IF EXISTS "pos_promo_products_delete" ON public."pos_promotion_products";
CREATE POLICY "pos_promo_products_delete" ON public."pos_promotion_products" FOR DELETE TO authenticated USING ((company_id IN ( SELECT company_members.company_id FROM company_members WHERE ((company_members.user_id = auth.uid()) AND (company_members.is_active = true)))));

DROP POLICY IF EXISTS "Company owner can view pos_promotions" ON public."pos_promotions";
CREATE POLICY "Company owner can view pos_promotions" ON public."pos_promotions" FOR SELECT USING (is_company_owner(company_id));

DROP POLICY IF EXISTS "Company owner can manage pos_promotions" ON public."pos_promotions";
CREATE POLICY "Company owner can manage pos_promotions" ON public."pos_promotions" FOR ALL USING (is_company_owner(company_id));

DROP POLICY IF EXISTS "Company owner can view pos_reservations" ON public."pos_reservations";
CREATE POLICY "Company owner can view pos_reservations" ON public."pos_reservations" FOR SELECT USING (is_company_owner(company_id));

DROP POLICY IF EXISTS "Company owner can manage pos_reservations" ON public."pos_reservations";
CREATE POLICY "Company owner can manage pos_reservations" ON public."pos_reservations" FOR ALL USING (is_company_owner(company_id));

DROP POLICY IF EXISTS "Company owner can view pos_sales_targets" ON public."pos_sales_targets";
CREATE POLICY "Company owner can view pos_sales_targets" ON public."pos_sales_targets" FOR SELECT USING (is_company_owner(company_id));

DROP POLICY IF EXISTS "Company owner can manage pos_sales_targets" ON public."pos_sales_targets";
CREATE POLICY "Company owner can manage pos_sales_targets" ON public."pos_sales_targets" FOR ALL USING (is_company_owner(company_id));

DROP POLICY IF EXISTS "Company owner can view pos_sessions" ON public."pos_sessions";
CREATE POLICY "Company owner can view pos_sessions" ON public."pos_sessions" FOR SELECT USING (is_company_owner(company_id));

DROP POLICY IF EXISTS "Company owner can manage pos_sessions" ON public."pos_sessions";
CREATE POLICY "Company owner can manage pos_sessions" ON public."pos_sessions" FOR ALL USING (is_company_owner(company_id));

DROP POLICY IF EXISTS "Company owner can view pos_tables" ON public."pos_tables";
CREATE POLICY "Company owner can view pos_tables" ON public."pos_tables" FOR SELECT USING (is_company_owner(company_id));

DROP POLICY IF EXISTS "Company owner can manage pos_tables" ON public."pos_tables";
CREATE POLICY "Company owner can manage pos_tables" ON public."pos_tables" FOR ALL USING (is_company_owner(company_id));

DROP POLICY IF EXISTS "Company owner can view pos_terminals" ON public."pos_terminals";
CREATE POLICY "Company owner can view pos_terminals" ON public."pos_terminals" FOR SELECT USING (is_company_owner(company_id));

DROP POLICY IF EXISTS "Company owner can manage pos_terminals" ON public."pos_terminals";
CREATE POLICY "Company owner can manage pos_terminals" ON public."pos_terminals" FOR ALL USING (is_company_owner(company_id));

DROP POLICY IF EXISTS "View pos_transaction_items" ON public."pos_transaction_items";
CREATE POLICY "View pos_transaction_items" ON public."pos_transaction_items" FOR SELECT USING ((EXISTS ( SELECT 1 FROM pos_transactions pt WHERE ((pt.id = pos_transaction_items.transaction_id) AND is_company_owner(pt.company_id)))));

DROP POLICY IF EXISTS "Manage pos_transaction_items" ON public."pos_transaction_items";
CREATE POLICY "Manage pos_transaction_items" ON public."pos_transaction_items" FOR ALL USING ((EXISTS ( SELECT 1 FROM pos_transactions pt WHERE ((pt.id = pos_transaction_items.transaction_id) AND is_company_owner(pt.company_id)))));

DROP POLICY IF EXISTS "Company owner can view pos_transactions" ON public."pos_transactions";
CREATE POLICY "Company owner can view pos_transactions" ON public."pos_transactions" FOR SELECT USING (is_company_owner(company_id));

DROP POLICY IF EXISTS "Company owner can manage pos_transactions" ON public."pos_transactions";
CREATE POLICY "Company owner can manage pos_transactions" ON public."pos_transactions" FOR ALL USING (is_company_owner(company_id));

DROP POLICY IF EXISTS "pos_users_select" ON public."pos_users";
CREATE POLICY "pos_users_select" ON public."pos_users" FOR SELECT TO authenticated USING ((company_id IN ( SELECT company_members.company_id FROM company_members WHERE ((company_members.user_id = auth.uid()) AND (company_members.is_active = true)))));

DROP POLICY IF EXISTS "pos_users_insert" ON public."pos_users";
CREATE POLICY "pos_users_insert" ON public."pos_users" FOR INSERT TO authenticated WITH CHECK ((company_id IN ( SELECT company_members.company_id FROM company_members WHERE ((company_members.user_id = auth.uid()) AND (company_members.is_active = true)))));

DROP POLICY IF EXISTS "pos_users_update" ON public."pos_users";
CREATE POLICY "pos_users_update" ON public."pos_users" FOR UPDATE TO authenticated USING ((company_id IN ( SELECT company_members.company_id FROM company_members WHERE ((company_members.user_id = auth.uid()) AND (company_members.is_active = true)))));

DROP POLICY IF EXISTS "pos_users_delete" ON public."pos_users";
CREATE POLICY "pos_users_delete" ON public."pos_users" FOR DELETE TO authenticated USING ((company_id IN ( SELECT company_members.company_id FROM company_members WHERE ((company_members.user_id = auth.uid()) AND (company_members.is_active = true)))));

DROP POLICY IF EXISTS "Company access prescription_items" ON public."prescription_items";
CREATE POLICY "Company access prescription_items" ON public."prescription_items" FOR ALL USING ((prescription_id IN ( SELECT prescriptions.id FROM prescriptions WHERE (prescriptions.company_id IN ( SELECT company_members.company_id FROM company_members WHERE ((company_members.user_id = auth.uid()) AND (company_members.is_active = true)) UNION SELECT companies.id FROM companies WHERE (companies.owner_id = auth.uid()))))));

DROP POLICY IF EXISTS "Company access prescriptions" ON public."prescriptions";
CREATE POLICY "Company access prescriptions" ON public."prescriptions" FOR ALL USING ((company_id IN ( SELECT company_members.company_id FROM company_members WHERE ((company_members.user_id = auth.uid()) AND (company_members.is_active = true)) UNION SELECT companies.id FROM companies WHERE (companies.owner_id = auth.uid()))));

DROP POLICY IF EXISTS "Company members can view price list items" ON public."price_list_items";
CREATE POLICY "Company members can view price list items" ON public."price_list_items" FOR SELECT USING ((EXISTS ( SELECT 1 FROM price_lists pl WHERE ((pl.id = price_list_items.price_list_id) AND is_company_member(pl.company_id)))));

DROP POLICY IF EXISTS "Company members can manage price list items" ON public."price_list_items";
CREATE POLICY "Company members can manage price list items" ON public."price_list_items" FOR ALL USING ((EXISTS ( SELECT 1 FROM price_lists pl WHERE ((pl.id = price_list_items.price_list_id) AND is_company_member(pl.company_id)))));

DROP POLICY IF EXISTS "Company members can view price lists" ON public."price_lists";
CREATE POLICY "Company members can view price lists" ON public."price_lists" FOR SELECT USING (is_company_member(company_id));

DROP POLICY IF EXISTS "Company members can manage price lists" ON public."price_lists";
CREATE POLICY "Company members can manage price lists" ON public."price_lists" FOR ALL USING (is_company_member(company_id));

DROP POLICY IF EXISTS "Company owner can view compatibility" ON public."product_car_compatibility";
CREATE POLICY "Company owner can view compatibility" ON public."product_car_compatibility" FOR SELECT USING ((EXISTS ( SELECT 1 FROM products p WHERE ((p.id = product_car_compatibility.product_id) AND is_company_owner(p.company_id)))));

DROP POLICY IF EXISTS "Company owner can manage compatibility" ON public."product_car_compatibility";
CREATE POLICY "Company owner can manage compatibility" ON public."product_car_compatibility" FOR ALL USING ((EXISTS ( SELECT 1 FROM products p WHERE ((p.id = product_car_compatibility.product_id) AND is_company_owner(p.company_id)))));

DROP POLICY IF EXISTS "Company members can view categories" ON public."product_categories";
CREATE POLICY "Company members can view categories" ON public."product_categories" FOR SELECT USING (is_company_member(company_id));

DROP POLICY IF EXISTS "Company members can manage categories" ON public."product_categories";
CREATE POLICY "Company members can manage categories" ON public."product_categories" FOR ALL USING (is_company_member(company_id));

DROP POLICY IF EXISTS "Company members can view stock" ON public."product_stock";
CREATE POLICY "Company members can view stock" ON public."product_stock" FOR SELECT USING ((EXISTS ( SELECT 1 FROM products p WHERE ((p.id = product_stock.product_id) AND is_company_member(p.company_id)))));

DROP POLICY IF EXISTS "Company members can manage stock" ON public."product_stock";
CREATE POLICY "Company members can manage stock" ON public."product_stock" FOR ALL USING ((EXISTS ( SELECT 1 FROM products p WHERE ((p.id = product_stock.product_id) AND is_company_member(p.company_id)))));

DROP POLICY IF EXISTS "Company members can view products" ON public."products";
CREATE POLICY "Company members can view products" ON public."products" FOR SELECT USING (is_company_member(company_id));

DROP POLICY IF EXISTS "Company members can manage products" ON public."products";
CREATE POLICY "Company members can manage products" ON public."products" FOR ALL USING (is_company_member(company_id));

DROP POLICY IF EXISTS "Owners can view all profiles" ON public."profiles";
CREATE POLICY "Owners can view all profiles" ON public."profiles" FOR SELECT USING (has_role(auth.uid(), 'owner'::app_role));

DROP POLICY IF EXISTS "Users can view own profile" ON public."profiles";
CREATE POLICY "Users can view own profile" ON public."profiles" FOR SELECT USING ((auth.uid() = user_id));

DROP POLICY IF EXISTS "deny_anon_read_profiles" ON public."profiles";
CREATE POLICY "deny_anon_read_profiles" ON public."profiles" FOR SELECT TO anon USING (false);

DROP POLICY IF EXISTS "Users can insert own profile" ON public."profiles";
CREATE POLICY "Users can insert own profile" ON public."profiles" FOR INSERT WITH CHECK ((auth.uid() = user_id));

DROP POLICY IF EXISTS "Users can update own profile" ON public."profiles";
CREATE POLICY "Users can update own profile" ON public."profiles" FOR UPDATE USING ((auth.uid() = user_id));

DROP POLICY IF EXISTS "Anyone can view rbac_permissions" ON public."rbac_permissions";
CREATE POLICY "Anyone can view rbac_permissions" ON public."rbac_permissions" FOR SELECT USING (true);

DROP POLICY IF EXISTS "Owners can manage rbac_permissions" ON public."rbac_permissions";
CREATE POLICY "Owners can manage rbac_permissions" ON public."rbac_permissions" FOR ALL USING (has_role(auth.uid(), 'owner'::app_role));

DROP POLICY IF EXISTS "View role perms for accessible roles" ON public."rbac_role_permissions";
CREATE POLICY "View role perms for accessible roles" ON public."rbac_role_permissions" FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1 FROM rbac_roles r WHERE ((r.id = rbac_role_permissions.role_id) AND ((r.company_id IS NULL) OR is_company_owner(r.company_id) OR has_role(auth.uid(), 'owner'::app_role))))));

DROP POLICY IF EXISTS "Manage role perms for own company" ON public."rbac_role_permissions";
CREATE POLICY "Manage role perms for own company" ON public."rbac_role_permissions" FOR ALL TO authenticated USING ((EXISTS ( SELECT 1 FROM rbac_roles r WHERE ((r.id = rbac_role_permissions.role_id) AND (is_company_owner(r.company_id) OR has_role(auth.uid(), 'owner'::app_role))))));

DROP POLICY IF EXISTS "Auth users can view system roles" ON public."rbac_roles";
CREATE POLICY "Auth users can view system roles" ON public."rbac_roles" FOR SELECT TO authenticated USING ((company_id IS NULL));

DROP POLICY IF EXISTS "Company owner can view own roles" ON public."rbac_roles";
CREATE POLICY "Company owner can view own roles" ON public."rbac_roles" FOR SELECT TO authenticated USING (((company_id IS NOT NULL) AND is_company_owner(company_id)));

DROP POLICY IF EXISTS "Company owner can manage own roles" ON public."rbac_roles";
CREATE POLICY "Company owner can manage own roles" ON public."rbac_roles" FOR ALL TO authenticated USING (((company_id IS NOT NULL) AND is_company_owner(company_id)));

DROP POLICY IF EXISTS "Platform owner manages all roles" ON public."rbac_roles";
CREATE POLICY "Platform owner manages all roles" ON public."rbac_roles" FOR ALL USING (has_role(auth.uid(), 'owner'::app_role));

DROP POLICY IF EXISTS "Company owner can view user roles" ON public."rbac_user_roles";
CREATE POLICY "Company owner can view user roles" ON public."rbac_user_roles" FOR SELECT TO authenticated USING ((is_company_owner(company_id) OR (user_id = auth.uid())));

DROP POLICY IF EXISTS "Company owner can manage user roles" ON public."rbac_user_roles";
CREATE POLICY "Company owner can manage user roles" ON public."rbac_user_roles" FOR ALL TO authenticated USING ((is_company_owner(company_id) OR has_role(auth.uid(), 'owner'::app_role)));

DROP POLICY IF EXISTS "re_account_settings_select" ON public."re_account_settings";
CREATE POLICY "re_account_settings_select" ON public."re_account_settings" FOR SELECT TO authenticated USING ((company_id IN ( SELECT company_members.company_id FROM company_members WHERE ((company_members.user_id = auth.uid()) AND (company_members.is_active = true)))));

DROP POLICY IF EXISTS "re_account_settings_insert" ON public."re_account_settings";
CREATE POLICY "re_account_settings_insert" ON public."re_account_settings" FOR INSERT TO authenticated WITH CHECK ((company_id IN ( SELECT company_members.company_id FROM company_members WHERE ((company_members.user_id = auth.uid()) AND (company_members.is_active = true)))));

DROP POLICY IF EXISTS "re_account_settings_update" ON public."re_account_settings";
CREATE POLICY "re_account_settings_update" ON public."re_account_settings" FOR UPDATE TO authenticated USING ((company_id IN ( SELECT company_members.company_id FROM company_members WHERE ((company_members.user_id = auth.uid()) AND (company_members.is_active = true)))));

DROP POLICY IF EXISTS "re_account_settings_delete" ON public."re_account_settings";
CREATE POLICY "re_account_settings_delete" ON public."re_account_settings" FOR DELETE TO authenticated USING ((company_id IN ( SELECT company_members.company_id FROM company_members WHERE ((company_members.user_id = auth.uid()) AND (company_members.is_active = true)))));

DROP POLICY IF EXISTS "re_leases_select" ON public."re_leases";
CREATE POLICY "re_leases_select" ON public."re_leases" FOR SELECT TO authenticated USING ((company_id IN ( SELECT company_members.company_id FROM company_members WHERE ((company_members.user_id = auth.uid()) AND (company_members.is_active = true)))));

DROP POLICY IF EXISTS "re_leases_insert" ON public."re_leases";
CREATE POLICY "re_leases_insert" ON public."re_leases" FOR INSERT TO authenticated WITH CHECK ((company_id IN ( SELECT company_members.company_id FROM company_members WHERE ((company_members.user_id = auth.uid()) AND (company_members.is_active = true)))));

DROP POLICY IF EXISTS "re_leases_update" ON public."re_leases";
CREATE POLICY "re_leases_update" ON public."re_leases" FOR UPDATE TO authenticated USING ((company_id IN ( SELECT company_members.company_id FROM company_members WHERE ((company_members.user_id = auth.uid()) AND (company_members.is_active = true)))));

DROP POLICY IF EXISTS "re_leases_delete" ON public."re_leases";
CREATE POLICY "re_leases_delete" ON public."re_leases" FOR DELETE TO authenticated USING ((company_id IN ( SELECT company_members.company_id FROM company_members WHERE ((company_members.user_id = auth.uid()) AND (company_members.is_active = true)))));

DROP POLICY IF EXISTS "re_maintenance_select" ON public."re_maintenance_requests";
CREATE POLICY "re_maintenance_select" ON public."re_maintenance_requests" FOR SELECT TO authenticated USING ((company_id IN ( SELECT company_members.company_id FROM company_members WHERE ((company_members.user_id = auth.uid()) AND (company_members.is_active = true)))));

DROP POLICY IF EXISTS "re_maintenance_insert" ON public."re_maintenance_requests";
CREATE POLICY "re_maintenance_insert" ON public."re_maintenance_requests" FOR INSERT TO authenticated WITH CHECK ((company_id IN ( SELECT company_members.company_id FROM company_members WHERE ((company_members.user_id = auth.uid()) AND (company_members.is_active = true)))));

DROP POLICY IF EXISTS "re_maintenance_update" ON public."re_maintenance_requests";
CREATE POLICY "re_maintenance_update" ON public."re_maintenance_requests" FOR UPDATE TO authenticated USING ((company_id IN ( SELECT company_members.company_id FROM company_members WHERE ((company_members.user_id = auth.uid()) AND (company_members.is_active = true)))));

DROP POLICY IF EXISTS "re_maintenance_delete" ON public."re_maintenance_requests";
CREATE POLICY "re_maintenance_delete" ON public."re_maintenance_requests" FOR DELETE TO authenticated USING ((company_id IN ( SELECT company_members.company_id FROM company_members WHERE ((company_members.user_id = auth.uid()) AND (company_members.is_active = true)))));

DROP POLICY IF EXISTS "re_properties_select" ON public."re_properties";
CREATE POLICY "re_properties_select" ON public."re_properties" FOR SELECT TO authenticated USING ((company_id IN ( SELECT company_members.company_id FROM company_members WHERE ((company_members.user_id = auth.uid()) AND (company_members.is_active = true)))));

DROP POLICY IF EXISTS "re_properties_insert" ON public."re_properties";
CREATE POLICY "re_properties_insert" ON public."re_properties" FOR INSERT TO authenticated WITH CHECK ((company_id IN ( SELECT company_members.company_id FROM company_members WHERE ((company_members.user_id = auth.uid()) AND (company_members.is_active = true)))));

DROP POLICY IF EXISTS "re_properties_update" ON public."re_properties";
CREATE POLICY "re_properties_update" ON public."re_properties" FOR UPDATE TO authenticated USING ((company_id IN ( SELECT company_members.company_id FROM company_members WHERE ((company_members.user_id = auth.uid()) AND (company_members.is_active = true)))));

DROP POLICY IF EXISTS "re_properties_delete" ON public."re_properties";
CREATE POLICY "re_properties_delete" ON public."re_properties" FOR DELETE TO authenticated USING ((company_id IN ( SELECT company_members.company_id FROM company_members WHERE ((company_members.user_id = auth.uid()) AND (company_members.is_active = true)))));

DROP POLICY IF EXISTS "re_rent_invoices_select" ON public."re_rent_invoices";
CREATE POLICY "re_rent_invoices_select" ON public."re_rent_invoices" FOR SELECT TO authenticated USING ((company_id IN ( SELECT company_members.company_id FROM company_members WHERE ((company_members.user_id = auth.uid()) AND (company_members.is_active = true)))));

DROP POLICY IF EXISTS "re_rent_invoices_insert" ON public."re_rent_invoices";
CREATE POLICY "re_rent_invoices_insert" ON public."re_rent_invoices" FOR INSERT TO authenticated WITH CHECK ((company_id IN ( SELECT company_members.company_id FROM company_members WHERE ((company_members.user_id = auth.uid()) AND (company_members.is_active = true)))));

DROP POLICY IF EXISTS "re_rent_invoices_update" ON public."re_rent_invoices";
CREATE POLICY "re_rent_invoices_update" ON public."re_rent_invoices" FOR UPDATE TO authenticated USING ((company_id IN ( SELECT company_members.company_id FROM company_members WHERE ((company_members.user_id = auth.uid()) AND (company_members.is_active = true)))));

DROP POLICY IF EXISTS "re_rent_invoices_delete" ON public."re_rent_invoices";
CREATE POLICY "re_rent_invoices_delete" ON public."re_rent_invoices" FOR DELETE TO authenticated USING ((company_id IN ( SELECT company_members.company_id FROM company_members WHERE ((company_members.user_id = auth.uid()) AND (company_members.is_active = true)))));

DROP POLICY IF EXISTS "re_rent_payments_select" ON public."re_rent_payments";
CREATE POLICY "re_rent_payments_select" ON public."re_rent_payments" FOR SELECT TO authenticated USING ((company_id IN ( SELECT company_members.company_id FROM company_members WHERE ((company_members.user_id = auth.uid()) AND (company_members.is_active = true)))));

DROP POLICY IF EXISTS "re_rent_payments_insert" ON public."re_rent_payments";
CREATE POLICY "re_rent_payments_insert" ON public."re_rent_payments" FOR INSERT TO authenticated WITH CHECK ((company_id IN ( SELECT company_members.company_id FROM company_members WHERE ((company_members.user_id = auth.uid()) AND (company_members.is_active = true)))));

DROP POLICY IF EXISTS "re_rent_payments_update" ON public."re_rent_payments";
CREATE POLICY "re_rent_payments_update" ON public."re_rent_payments" FOR UPDATE TO authenticated USING ((company_id IN ( SELECT company_members.company_id FROM company_members WHERE ((company_members.user_id = auth.uid()) AND (company_members.is_active = true)))));

DROP POLICY IF EXISTS "re_rent_payments_delete" ON public."re_rent_payments";
CREATE POLICY "re_rent_payments_delete" ON public."re_rent_payments" FOR DELETE TO authenticated USING ((company_id IN ( SELECT company_members.company_id FROM company_members WHERE ((company_members.user_id = auth.uid()) AND (company_members.is_active = true)))));

DROP POLICY IF EXISTS "re_tenants_select" ON public."re_tenants";
CREATE POLICY "re_tenants_select" ON public."re_tenants" FOR SELECT TO authenticated USING ((company_id IN ( SELECT company_members.company_id FROM company_members WHERE ((company_members.user_id = auth.uid()) AND (company_members.is_active = true)))));

DROP POLICY IF EXISTS "re_tenants_insert" ON public."re_tenants";
CREATE POLICY "re_tenants_insert" ON public."re_tenants" FOR INSERT TO authenticated WITH CHECK ((company_id IN ( SELECT company_members.company_id FROM company_members WHERE ((company_members.user_id = auth.uid()) AND (company_members.is_active = true)))));

DROP POLICY IF EXISTS "re_tenants_update" ON public."re_tenants";
CREATE POLICY "re_tenants_update" ON public."re_tenants" FOR UPDATE TO authenticated USING ((company_id IN ( SELECT company_members.company_id FROM company_members WHERE ((company_members.user_id = auth.uid()) AND (company_members.is_active = true)))));

DROP POLICY IF EXISTS "re_tenants_delete" ON public."re_tenants";
CREATE POLICY "re_tenants_delete" ON public."re_tenants" FOR DELETE TO authenticated USING ((company_id IN ( SELECT company_members.company_id FROM company_members WHERE ((company_members.user_id = auth.uid()) AND (company_members.is_active = true)))));

DROP POLICY IF EXISTS "re_units_select" ON public."re_units";
CREATE POLICY "re_units_select" ON public."re_units" FOR SELECT TO authenticated USING ((company_id IN ( SELECT company_members.company_id FROM company_members WHERE ((company_members.user_id = auth.uid()) AND (company_members.is_active = true)))));

DROP POLICY IF EXISTS "re_units_insert" ON public."re_units";
CREATE POLICY "re_units_insert" ON public."re_units" FOR INSERT TO authenticated WITH CHECK ((company_id IN ( SELECT company_members.company_id FROM company_members WHERE ((company_members.user_id = auth.uid()) AND (company_members.is_active = true)))));

DROP POLICY IF EXISTS "re_units_update" ON public."re_units";
CREATE POLICY "re_units_update" ON public."re_units" FOR UPDATE TO authenticated USING ((company_id IN ( SELECT company_members.company_id FROM company_members WHERE ((company_members.user_id = auth.uid()) AND (company_members.is_active = true)))));

DROP POLICY IF EXISTS "re_units_delete" ON public."re_units";
CREATE POLICY "re_units_delete" ON public."re_units" FOR DELETE TO authenticated USING ((company_id IN ( SELECT company_members.company_id FROM company_members WHERE ((company_members.user_id = auth.uid()) AND (company_members.is_active = true)))));

DROP POLICY IF EXISTS "View stock_adjustment_items" ON public."stock_adjustment_items";
CREATE POLICY "View stock_adjustment_items" ON public."stock_adjustment_items" FOR SELECT USING ((EXISTS ( SELECT 1 FROM stock_adjustments sa WHERE ((sa.id = stock_adjustment_items.adjustment_id) AND is_company_owner(sa.company_id)))));

DROP POLICY IF EXISTS "Manage stock_adjustment_items" ON public."stock_adjustment_items";
CREATE POLICY "Manage stock_adjustment_items" ON public."stock_adjustment_items" FOR ALL USING ((EXISTS ( SELECT 1 FROM stock_adjustments sa WHERE ((sa.id = stock_adjustment_items.adjustment_id) AND is_company_owner(sa.company_id)))));

DROP POLICY IF EXISTS "Company owner can view stock_adjustments" ON public."stock_adjustments";
CREATE POLICY "Company owner can view stock_adjustments" ON public."stock_adjustments" FOR SELECT USING (is_company_owner(company_id));

DROP POLICY IF EXISTS "Company owner can manage stock_adjustments" ON public."stock_adjustments";
CREATE POLICY "Company owner can manage stock_adjustments" ON public."stock_adjustments" FOR ALL USING (is_company_owner(company_id));

DROP POLICY IF EXISTS "Stock count lines inherit session access" ON public."stock_count_lines";
CREATE POLICY "Stock count lines inherit session access" ON public."stock_count_lines" FOR ALL TO authenticated USING ((session_id IN ( SELECT stock_count_sessions.id FROM stock_count_sessions WHERE (stock_count_sessions.company_id IN ( SELECT companies.id FROM companies WHERE (companies.owner_id = auth.uid()) UNION SELECT company_members.company_id FROM company_members WHERE ((company_members.user_id = auth.uid()) AND (company_members.is_active = true)))))));

DROP POLICY IF EXISTS "Company members can manage stock count sessions" ON public."stock_count_sessions";
CREATE POLICY "Company members can manage stock count sessions" ON public."stock_count_sessions" FOR ALL TO authenticated USING ((company_id IN ( SELECT companies.id FROM companies WHERE (companies.owner_id = auth.uid()) UNION SELECT company_members.company_id FROM company_members WHERE ((company_members.user_id = auth.uid()) AND (company_members.is_active = true)))));

DROP POLICY IF EXISTS "Company members can view stock movements" ON public."stock_movements";
CREATE POLICY "Company members can view stock movements" ON public."stock_movements" FOR SELECT USING (is_company_member(company_id));

DROP POLICY IF EXISTS "Company members can manage stock movements" ON public."stock_movements";
CREATE POLICY "Company members can manage stock movements" ON public."stock_movements" FOR ALL USING (is_company_member(company_id));

DROP POLICY IF EXISTS "View stock_transfer_items" ON public."stock_transfer_items";
CREATE POLICY "View stock_transfer_items" ON public."stock_transfer_items" FOR SELECT USING ((EXISTS ( SELECT 1 FROM stock_transfers st WHERE ((st.id = stock_transfer_items.transfer_id) AND is_company_owner(st.company_id)))));

DROP POLICY IF EXISTS "Manage stock_transfer_items" ON public."stock_transfer_items";
CREATE POLICY "Manage stock_transfer_items" ON public."stock_transfer_items" FOR ALL USING ((EXISTS ( SELECT 1 FROM stock_transfers st WHERE ((st.id = stock_transfer_items.transfer_id) AND is_company_owner(st.company_id)))));

DROP POLICY IF EXISTS "Company owner can view stock_transfers" ON public."stock_transfers";
CREATE POLICY "Company owner can view stock_transfers" ON public."stock_transfers" FOR SELECT USING (is_company_owner(company_id));

DROP POLICY IF EXISTS "Company owner can manage stock_transfers" ON public."stock_transfers";
CREATE POLICY "Company owner can manage stock_transfers" ON public."stock_transfers" FOR ALL USING (is_company_owner(company_id));

DROP POLICY IF EXISTS "Authenticated users can view plans" ON public."subscription_plans";
CREATE POLICY "Authenticated users can view plans" ON public."subscription_plans" FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Anyone can view active plans" ON public."subscription_plans";
CREATE POLICY "Anyone can view active plans" ON public."subscription_plans" FOR SELECT USING ((is_active = true));

DROP POLICY IF EXISTS "Owners can manage plans" ON public."subscription_plans";
CREATE POLICY "Owners can manage plans" ON public."subscription_plans" FOR ALL USING (has_role(auth.uid(), 'owner'::app_role));

DROP POLICY IF EXISTS "Company owner can insert subscription" ON public."subscriptions";
CREATE POLICY "Company owner can insert subscription" ON public."subscriptions" FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1 FROM companies WHERE ((companies.id = subscriptions.company_id) AND (companies.owner_id = auth.uid())))));

DROP POLICY IF EXISTS "Company members can view subscriptions" ON public."subscriptions";
CREATE POLICY "Company members can view subscriptions" ON public."subscriptions" FOR SELECT USING (is_company_member(company_id));

DROP POLICY IF EXISTS "Owners can manage all subscriptions" ON public."subscriptions";
CREATE POLICY "Owners can manage all subscriptions" ON public."subscriptions" FOR ALL USING (has_role(auth.uid(), 'owner'::app_role));

DROP POLICY IF EXISTS "Authenticated users can view screens" ON public."system_screens";
CREATE POLICY "Authenticated users can view screens" ON public."system_screens" FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Anyone can view active testimonials" ON public."testimonials";
CREATE POLICY "Anyone can view active testimonials" ON public."testimonials" FOR SELECT USING ((is_active = true));

DROP POLICY IF EXISTS "Owners can manage testimonials" ON public."testimonials";
CREATE POLICY "Owners can manage testimonials" ON public."testimonials" FOR ALL USING (has_role(auth.uid(), 'owner'::app_role));

DROP POLICY IF EXISTS "Company members can view treasury transactions" ON public."treasury_transactions";
CREATE POLICY "Company members can view treasury transactions" ON public."treasury_transactions" FOR SELECT USING (is_company_member(company_id));

DROP POLICY IF EXISTS "Company members can manage treasury transactions" ON public."treasury_transactions";
CREATE POLICY "Company members can manage treasury transactions" ON public."treasury_transactions" FOR ALL USING (is_company_member(company_id));

DROP POLICY IF EXISTS "Company members can view units" ON public."units";
CREATE POLICY "Company members can view units" ON public."units" FOR SELECT USING (is_company_member(company_id));

DROP POLICY IF EXISTS "Company members can manage units" ON public."units";
CREATE POLICY "Company members can manage units" ON public."units" FOR ALL USING (is_company_member(company_id));

DROP POLICY IF EXISTS "Company owner can view own usage" ON public."usage_tracking";
CREATE POLICY "Company owner can view own usage" ON public."usage_tracking" FOR SELECT USING (is_company_owner(company_id));

DROP POLICY IF EXISTS "System can manage usage" ON public."usage_tracking";
CREATE POLICY "System can manage usage" ON public."usage_tracking" FOR ALL USING (true);

DROP POLICY IF EXISTS "Users can view own roles" ON public."user_roles";
CREATE POLICY "Users can view own roles" ON public."user_roles" FOR SELECT USING ((auth.uid() = user_id));

DROP POLICY IF EXISTS "Owners can manage roles" ON public."user_roles";
CREATE POLICY "Owners can manage roles" ON public."user_roles" FOR ALL USING (has_role(auth.uid(), 'owner'::app_role));

DROP POLICY IF EXISTS "Anyone can view vertical screens" ON public."vertical_screens";
CREATE POLICY "Anyone can view vertical screens" ON public."vertical_screens" FOR SELECT USING (true);

DROP POLICY IF EXISTS "Owners can manage vertical screens" ON public."vertical_screens";
CREATE POLICY "Owners can manage vertical screens" ON public."vertical_screens" FOR ALL USING (has_role(auth.uid(), 'owner'::app_role));

DROP POLICY IF EXISTS "Company members can view warehouses" ON public."warehouses";
CREATE POLICY "Company members can view warehouses" ON public."warehouses" FOR SELECT USING (is_company_member(company_id));

DROP POLICY IF EXISTS "Company members can manage warehouses" ON public."warehouses";
CREATE POLICY "Company members can manage warehouses" ON public."warehouses" FOR ALL USING (is_company_member(company_id));

DROP POLICY IF EXISTS "Company owner can view zatca_invoice_logs" ON public."zatca_invoice_logs";
CREATE POLICY "Company owner can view zatca_invoice_logs" ON public."zatca_invoice_logs" FOR SELECT USING (is_company_owner(company_id));

DROP POLICY IF EXISTS "Company owner can manage zatca_invoice_logs" ON public."zatca_invoice_logs";
CREATE POLICY "Company owner can manage zatca_invoice_logs" ON public."zatca_invoice_logs" FOR ALL USING (is_company_owner(company_id));

DROP POLICY IF EXISTS "Company owner can view zatca_retry_queue" ON public."zatca_retry_queue";
CREATE POLICY "Company owner can view zatca_retry_queue" ON public."zatca_retry_queue" FOR SELECT USING (is_company_owner(company_id));

DROP POLICY IF EXISTS "Company owner can manage zatca_retry_queue" ON public."zatca_retry_queue";
CREATE POLICY "Company owner can manage zatca_retry_queue" ON public."zatca_retry_queue" FOR ALL USING (is_company_owner(company_id));

DROP POLICY IF EXISTS "Company owner can view zatca_settings" ON public."zatca_settings";
CREATE POLICY "Company owner can view zatca_settings" ON public."zatca_settings" FOR SELECT USING (is_company_owner(company_id));

DROP POLICY IF EXISTS "Company owner can manage zatca_settings" ON public."zatca_settings";
CREATE POLICY "Company owner can manage zatca_settings" ON public."zatca_settings" FOR ALL USING (is_company_owner(company_id));

