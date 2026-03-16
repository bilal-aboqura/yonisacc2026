-- =============================================
-- MIGRATION: Fix RLS on companies table for platform owner
-- Problem: Platform owner (has_role = 'owner') cannot see companies
--          in the /owner/subscribers page because the current RLS
--          only allows owner_id or company_members.
-- Solution: Add a policy that allows platform owners to view ALL companies.
-- =============================================

-- Drop existing policies that conflict before re-creating them
DROP POLICY IF EXISTS "Platform owner can manage all companies" ON public.companies;
DROP POLICY IF EXISTS "Platform owner can view all companies" ON public.companies;

-- Allow platform owners (role = 'owner') to SELECT all companies
CREATE POLICY "Platform owner can view all companies" ON public.companies
    FOR SELECT
    USING (public.has_role(auth.uid(), 'owner'));

-- Allow platform owners (role = 'owner') to manage (INSERT/UPDATE/DELETE) all companies
CREATE POLICY "Platform owner can manage all companies" ON public.companies
    FOR ALL
    USING (public.has_role(auth.uid(), 'owner'));

-- =============================================
-- ALSO fix subscriptions table:
-- Platform owner should see ALL subscriptions (not just their company's)
-- =============================================
DROP POLICY IF EXISTS "Platform owner can view all subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Platform owner can manage all subscriptions" ON public.subscriptions;

CREATE POLICY "Platform owner can view all subscriptions" ON public.subscriptions
    FOR SELECT
    USING (public.has_role(auth.uid(), 'owner'));

CREATE POLICY "Platform owner can manage all subscriptions" ON public.subscriptions
    FOR ALL
    USING (public.has_role(auth.uid(), 'owner'));
