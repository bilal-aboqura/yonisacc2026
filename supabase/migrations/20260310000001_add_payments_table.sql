-- =============================================
-- MIGRATION: Add payments table for payment gateway integration
-- =============================================

CREATE TABLE IF NOT EXISTS public.payments (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id uuid NOT NULL REFERENCES public.companies(id),
    subscription_id uuid REFERENCES public.subscriptions(id),
    plan_id uuid REFERENCES public.subscription_plans(id),

    -- Amount
    amount numeric(12,2) NOT NULL,
    currency text NOT NULL DEFAULT 'SAR',

    -- Gateway info
    gateway text NOT NULL DEFAULT 'moyasar', -- moyasar, tap, manual
    gateway_payment_id text,                 -- ID from the payment gateway
    gateway_status text,                     -- Raw status from gateway

    -- Internal status
    status text NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'paid', 'failed', 'refunded', 'cancelled')),

    -- Payment method
    payment_method text,  -- credit_card, mada, bank_transfer, apple_pay

    -- Timestamps
    created_at timestamptz NOT NULL DEFAULT now(),
    paid_at timestamptz,
    
    -- Extra data
    description text,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_by uuid REFERENCES auth.users(id),
    
    -- Callback URL used for redirect after payment
    callback_url text
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_payments_company_id ON public.payments(company_id);
CREATE INDEX IF NOT EXISTS idx_payments_subscription_id ON public.payments(subscription_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_gateway_payment_id ON public.payments(gateway_payment_id);

-- RLS
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Company members can view their own payments
CREATE POLICY "Company members can view payments" ON public.payments
    FOR SELECT USING (is_company_member(company_id));

-- Only the system (service role) or company owner creates payments
CREATE POLICY "Company members can create payments" ON public.payments
    FOR INSERT WITH CHECK (is_company_member(company_id));

-- Platform owners can view all payments
CREATE POLICY "Platform owner can view all payments" ON public.payments
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'owner')
    );

-- Trigger for updated_at (if we add it later)
-- =============================================
-- Also add grace_period_end to subscriptions for grace period support
-- =============================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'subscriptions' AND column_name = 'grace_period_end'
    ) THEN
        ALTER TABLE public.subscriptions ADD COLUMN grace_period_end date;
    END IF;
END$$;
