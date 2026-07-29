-- Migration : 0044_single_standard_plan
-- Description: Replace the 3-tier Starter/Growth/Enterprise billing plans with a single
--              flat "Standard" plan (PHP 3,499/mo, 150 active-member cap, everything
--              included) per the launch pricing decision. Old plans are deactivated
--              (not deleted) so any historical subscriptions keep a valid FK.
-- Idempotent : ON CONFLICT (name) keeps re-runs safe.

UPDATE plans SET is_active = false WHERE name IN ('Starter', 'Growth', 'Enterprise');

ALTER TABLE plans DROP CONSTRAINT IF EXISTS plans_tier_check;
ALTER TABLE plans ADD CONSTRAINT plans_tier_check CHECK (tier IN ('BASIC', 'GROWTH', 'ENTERPRISE', 'STANDARD'));

INSERT INTO plans (
  name, tier, description,
  max_gyms, max_members_per_gym, ai_token_quota_monthly,
  price_monthly, price_yearly, is_active
) VALUES (
  'Standard', 'STANDARD',
  'Everything included — up to 150 active members.',
  1, 150, 200000,
  3499.00, 34990.00, true
)
ON CONFLICT (name) DO UPDATE SET
  tier = EXCLUDED.tier,
  description = EXCLUDED.description,
  max_gyms = EXCLUDED.max_gyms,
  max_members_per_gym = EXCLUDED.max_members_per_gym,
  ai_token_quota_monthly = EXCLUDED.ai_token_quota_monthly,
  price_monthly = EXCLUDED.price_monthly,
  price_yearly = EXCLUDED.price_yearly,
  is_active = EXCLUDED.is_active;

INSERT INTO plan_features (plan_id, feature_key, is_included, limits)
SELECT p.id, f.feature_key, f.is_included, f.limits::JSONB
FROM plans p
JOIN (VALUES
  ('community_chat',   true, NULL),
  ('ai_assistant',     true, '{"monthly_tokens": 200000}'),
  ('advanced_reports', true, '{"history_days": 90}'),
  ('custom_branding',  true, NULL),
  ('announcements',    true, '{"max_pinned": 10}')
) AS f(feature_key, is_included, limits)
  ON p.name = 'Standard'
ON CONFLICT (plan_id, feature_key) DO UPDATE SET
  is_included = EXCLUDED.is_included,
  limits = EXCLUDED.limits;
