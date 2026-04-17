-- Seed : 004_plans
-- Description: SaaS subscription tiers and feature flags
-- Idempotent: uses INSERT ... ON CONFLICT DO NOTHING

-- ─────────────────────────────────────────────────────────────────────────────
-- Plans
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO plans (
  name, tier, description,
  max_gyms, max_members_per_gym, ai_token_quota_monthly,
  price_monthly, price_yearly, is_active
) VALUES
  (
    'Starter', 'BASIC',
    'For single-gym owners getting started.',
    1, 200, 0,
    499.00, 4990.00, true
  ),
  (
    'Growth', 'GROWTH',
    'For growing gyms and small chains.',
    3, 1000, 200000,
    1299.00, 12990.00, true
  ),
  (
    'Enterprise', 'ENTERPRISE',
    'Unlimited gyms and members for large organizations.',
    -1, -1, 1000000,
    3999.00, 39990.00, true
  )
ON CONFLICT DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- Plan features
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO plan_features (plan_id, feature_key, is_included, limits)
SELECT p.id, f.feature_key, f.is_included, f.limits::JSONB
FROM plans p
JOIN (VALUES
  -- community_chat
  ('Starter',    'community_chat',    true,  NULL),
  ('Growth',     'community_chat',    true,  NULL),
  ('Enterprise', 'community_chat',    true,  NULL),

  -- ai_assistant (not in MVP, but feature flags seeded for future)
  ('Starter',    'ai_assistant',      false, NULL),
  ('Growth',     'ai_assistant',      true,  '{"monthly_tokens": 200000}'),
  ('Enterprise', 'ai_assistant',      true,  '{"monthly_tokens": 1000000}'),

  -- advanced_reports
  ('Starter',    'advanced_reports',  false, NULL),
  ('Growth',     'advanced_reports',  true,  '{"history_days": 90}'),
  ('Enterprise', 'advanced_reports',  true,  '{"history_days": 365}'),

  -- custom_branding (custom hex colors)
  ('Starter',    'custom_branding',   false, NULL),
  ('Growth',     'custom_branding',   true,  NULL),
  ('Enterprise', 'custom_branding',   true,  NULL),

  -- announcements (all plans get this)
  ('Starter',    'announcements',     true,  '{"max_pinned": 3}'),
  ('Growth',     'announcements',     true,  '{"max_pinned": 10}'),
  ('Enterprise', 'announcements',     true,  '{"max_pinned": -1}')

) AS f(plan_name, feature_key, is_included, limits)
  ON p.name = f.plan_name
ON CONFLICT (plan_id, feature_key) DO NOTHING;
