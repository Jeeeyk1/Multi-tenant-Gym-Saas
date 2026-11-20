-- Migration : 0045_seed_saas_plan
-- Description: Seeds the landing-page-facing `saas_plans` table, which has been empty since
--              its table was created (0028) — the public pricing page has been silently
--              falling back to a hardcoded two-tier placeholder ever since, which no longer
--              matches the real single Standard billing plan (see 0044_single_standard_plan).
--              This is the one plan gym owners actually see and subscribe to.
-- Idempotent : guarded by NOT EXISTS, so a re-run is a no-op once a plan row exists.

INSERT INTO saas_plans (name, description, price_monthly, price_yearly, features, is_popular, is_active, sort_order)
SELECT
  'Standard',
  'Everything you need to run your gym — one plan, no tiers to compare.',
  3499.00,
  34990.00,
  '[
    "Up to 150 active members",
    "Member mobile app (iOS & Android)",
    "Smart check-in system",
    "Staff & owner web dashboard",
    "Membership plans, renewals & billing",
    "Announcements & community chat",
    "Leaderboard & badges",
    "AI Coach — workout & meal plans for members",
    "AI Insights — ask questions about your gym data",
    "Email support"
  ]'::jsonb,
  true,
  true,
  0
WHERE NOT EXISTS (SELECT 1 FROM saas_plans);
