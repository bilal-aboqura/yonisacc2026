-- ============================================================
-- MIGRATION: Fix subscription system - auto trial on signup
-- ============================================================

-- 1. Add 'trialing' to the enum if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'trialing' 
      AND enumtypid = 'public.subscription_status'::regtype
  ) THEN
    ALTER TYPE public.subscription_status ADD VALUE 'trialing';
  END IF;
END;
$$;
