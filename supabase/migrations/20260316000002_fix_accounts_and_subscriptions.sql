-- =============================================
-- FIX 3: Backfill accounts for existing companies
--         & add allowed_modules to subscription plans
-- =============================================

-- 1. Add allowed_modules column to subscription_plans if it doesn't exist
ALTER TABLE public.subscription_plans
  ADD COLUMN IF NOT EXISTS allowed_modules TEXT[] DEFAULT NULL;

-- 2. Add allowed_modules column to company_members if it doesn't exist
ALTER TABLE public.company_members
  ADD COLUMN IF NOT EXISTS allowed_modules TEXT[] DEFAULT NULL;

-- 3. Ensure RLS policy allows company members to read their own member row
--    (needed for useAllowedModules hook)
DROP POLICY IF EXISTS "Members can view own membership" ON public.company_members;
CREATE POLICY "Members can view own membership" ON public.company_members
    FOR SELECT USING (user_id = auth.uid());

-- 4. Backfill chart of accounts for ALL existing companies that have no accounts yet
DO $$
DECLARE
  rec RECORD;
BEGIN
  FOR rec IN
    SELECT id FROM public.companies
    WHERE deleted_at IS NULL
      AND id NOT IN (SELECT DISTINCT company_id FROM public.accounts)
  LOOP
    BEGIN
      PERFORM public.create_default_chart_of_accounts(rec.id);
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Failed to create accounts for company %: %', rec.id, SQLERRM;
    END;
  END LOOP;
END;
$$;

-- 5. Fix RLS on accounts table so team members can also read/write
--    (needed for dashboard and all accounting pages)
DROP POLICY IF EXISTS "Company members can view accounts" ON public.accounts;
DROP POLICY IF EXISTS "Company members can manage accounts" ON public.accounts;

-- Allow company owner to do everything
DROP POLICY IF EXISTS "Company owner can view accounts" ON public.accounts;
DROP POLICY IF EXISTS "Company owner can manage accounts" ON public.accounts;

CREATE POLICY "Company owner can manage accounts" ON public.accounts
  FOR ALL USING (public.is_company_owner(company_id));

-- Allow active team members to read accounts
CREATE POLICY "Company members can view accounts" ON public.accounts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.company_members cm
      WHERE cm.company_id = accounts.company_id
        AND cm.user_id = auth.uid()
        AND cm.is_active = true
    )
  );

-- Allow active team members to insert/update accounts
CREATE POLICY "Company members can manage accounts" ON public.accounts
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.company_members cm
      WHERE cm.company_id = accounts.company_id
        AND cm.user_id = auth.uid()
        AND cm.is_active = true
    )
  );

-- 6. Fix RLS policies for subscriptions so team members can check their subscription
DROP POLICY IF EXISTS "Company members can view subscriptions" ON public.subscriptions;
CREATE POLICY "Company members can view subscriptions" ON public.subscriptions
  FOR SELECT USING (
    public.is_company_owner(company_id)
    OR EXISTS (
      SELECT 1 FROM public.company_members cm
      WHERE cm.company_id = subscriptions.company_id
        AND cm.user_id = auth.uid()
        AND cm.is_active = true
    )
  );

-- 7. Grant execute on create_default_chart_of_accounts to authenticated users
GRANT EXECUTE ON FUNCTION public.create_default_chart_of_accounts(UUID) TO authenticated;
