-- Phase 1: Add explicit denial policies for anonymous users

-- Deny anonymous read on contact_messages
CREATE POLICY "deny_anon_read_contact_messages" ON public.contact_messages 
FOR SELECT TO anon USING (false);

-- Deny anonymous read on profiles
CREATE POLICY "deny_anon_read_profiles" ON public.profiles 
FOR SELECT TO anon USING (false);

-- Deny anonymous read on companies
CREATE POLICY "deny_anon_read_companies" ON public.companies 
FOR SELECT TO anon USING (false);

-- Deny anonymous read on contacts
CREATE POLICY "deny_anon_read_contacts" ON public.contacts 
FOR SELECT TO anon USING (false);

-- Deny anonymous read on bank_accounts
CREATE POLICY "deny_anon_read_bank_accounts" ON public.bank_accounts 
FOR SELECT TO anon USING (false);

-- Phase 2: Restrict system tables to authenticated users only

-- Update system_screens policy
DROP POLICY IF EXISTS "Anyone can view screens" ON public.system_screens;
CREATE POLICY "Authenticated users can view screens" 
ON public.system_screens FOR SELECT TO authenticated USING (true);

-- Update plan_screens policy
DROP POLICY IF EXISTS "Anyone can view plan screens" ON public.plan_screens;
CREATE POLICY "Authenticated users can view plan screens" 
ON public.plan_screens FOR SELECT TO authenticated USING (true);

-- Update subscription_plans policy
DROP POLICY IF EXISTS "Anyone can view plans" ON public.subscription_plans;
CREATE POLICY "Authenticated users can view plans" 
ON public.subscription_plans FOR SELECT TO authenticated USING (true);