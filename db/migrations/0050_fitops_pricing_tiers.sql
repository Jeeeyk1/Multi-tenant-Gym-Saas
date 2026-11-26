-- Migration : 0050_fitops_pricing_tiers
-- Description: Starter (75 members), Standard (200, most popular) and Pro (500), every feature on every
--              tier, for both saas_plans (landing display, new member_limit) and plans (billing).
-- Idempotent : rows are matched by name.

ALTER TABLE saas_plans ADD COLUMN IF NOT EXISTS member_limit INTEGER;
ALTER TABLE saas_plans DROP CONSTRAINT IF EXISTS saas_plans_member_limit_check;
ALTER TABLE saas_plans ADD CONSTRAINT saas_plans_member_limit_check CHECK (member_limit IS NULL OR member_limit > 0);

CREATE TEMP TABLE fitops_tiers (
  name          TEXT,
  description   TEXT,
  member_limit  INTEGER,
  price_monthly NUMERIC(10,2),
  price_yearly  NUMERIC(10,2),
  is_popular    BOOLEAN,
  sort_order    INTEGER
) ON COMMIT DROP;

INSERT INTO fitops_tiers VALUES
  ('Starter',  'For new and smaller gyms.',             75, 2499.00, 24990.00, false, 0),
  ('Standard', 'For established neighborhood gyms.',   200, 3999.00, 39990.00, true,  1),
  ('Pro',      'For large and busy gyms.',             500, 6999.00, 69990.00, false, 2);

CREATE TEMP TABLE fitops_features ON COMMIT DROP AS
SELECT '[
  "Member app for iOS and Android",
  "Smart check-in system",
  "Staff and owner web dashboard",
  "Membership plans, renewals and billing",
  "Announcements and community chat",
  "Leaderboards and badges",
  "AI Coach: workout and meal plans",
  "AI Insights about your gym data",
  "Email support"
]'::jsonb AS features;

UPDATE saas_plans SET is_active = false, updated_at = NOW()
WHERE name NOT IN (SELECT name FROM fitops_tiers) AND is_active;

UPDATE saas_plans s SET
  description   = t.description,
  member_limit  = t.member_limit,
  price_monthly = t.price_monthly,
  price_yearly  = t.price_yearly,
  features      = f.features,
  is_popular    = t.is_popular,
  is_active     = true,
  sort_order    = t.sort_order,
  updated_at    = NOW()
FROM fitops_tiers t, fitops_features f
WHERE s.name = t.name;

INSERT INTO saas_plans (name, description, member_limit, price_monthly, price_yearly, features, is_popular, is_active, sort_order)
SELECT t.name, t.description, t.member_limit, t.price_monthly, t.price_yearly, f.features, t.is_popular, true, t.sort_order
FROM fitops_tiers t, fitops_features f
WHERE NOT EXISTS (SELECT 1 FROM saas_plans s WHERE s.name = t.name);

ALTER TABLE plans DROP CONSTRAINT IF EXISTS plans_tier_check;
ALTER TABLE plans ADD CONSTRAINT plans_tier_check
  CHECK (tier IN ('BASIC', 'GROWTH', 'ENTERPRISE', 'STANDARD', 'PRO'));

INSERT INTO plans (
  name, tier, description,
  max_gyms, max_members_per_gym, ai_token_quota_monthly,
  price_monthly, price_yearly, is_active
) VALUES
  ('Starter',  'BASIC',    'Everything included, up to 75 active members.',  1,  75, 200000, 2499.00, 24990.00, true),
  ('Standard', 'STANDARD', 'Everything included, up to 200 active members.', 1, 200, 200000, 3999.00, 39990.00, true),
  ('Pro',      'PRO',      'Everything included, up to 500 active members.', 1, 500, 200000, 6999.00, 69990.00, true)
ON CONFLICT (name) DO UPDATE SET
  tier = EXCLUDED.tier,
  description = EXCLUDED.description,
  max_gyms = EXCLUDED.max_gyms,
  max_members_per_gym = EXCLUDED.max_members_per_gym,
  ai_token_quota_monthly = EXCLUDED.ai_token_quota_monthly,
  price_monthly = EXCLUDED.price_monthly,
  price_yearly = EXCLUDED.price_yearly,
  is_active = EXCLUDED.is_active;

-- Same feature flags as Standard in 0044, on every tier.
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
  ON p.name IN ('Starter', 'Standard', 'Pro')
ON CONFLICT (plan_id, feature_key) DO UPDATE SET
  is_included = EXCLUDED.is_included,
  limits = EXCLUDED.limits;
