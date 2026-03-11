-- =============================================
-- MIGRATION: Set up pg_cron schedules for subscription automation
-- =============================================
-- NOTE: pg_cron requires Supabase Pro plan.
-- If not available, these functions can be triggered manually from the owner dashboard.

-- Enable extensions if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Schedule: Expire subscriptions daily at midnight UTC
SELECT cron.schedule(
  'expire-subscriptions-daily',
  '0 0 * * *',
  $$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_url') || '/functions/v1/expire-subscriptions',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')
    ),
    body := '{}'::jsonb
  );
  $$
);

-- Schedule: Subscription renewal reminders daily at 8 AM UTC
SELECT cron.schedule(
  'renewal-reminders-daily',
  '0 8 * * *',
  $$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_url') || '/functions/v1/subscription-renewal-reminder',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')
    ),
    body := '{}'::jsonb
  );
  $$
);

-- Schedule: Reset usage counters on the 1st of each month at midnight UTC
SELECT cron.schedule(
  'reset-usage-monthly',
  '0 0 1 * *',
  $$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_url') || '/functions/v1/reset-usage',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')
    ),
    body := '{}'::jsonb
  );
  $$
);

-- ======================
-- IMPORTANT: Before running this migration, you must store secrets in Supabase Vault:
--
--   SELECT vault.create_secret('https://YOUR_PROJECT.supabase.co', 'supabase_url');
--   SELECT vault.create_secret('YOUR_SERVICE_ROLE_KEY', 'service_role_key');
--
-- Run these in the Supabase SQL Editor BEFORE applying this migration.
-- ======================
