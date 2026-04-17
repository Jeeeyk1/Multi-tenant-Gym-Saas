-- Migration : 0005_gym_profile_schedules_features
-- Description: Gym domain — gym_profile, gym_schedules, gym_features
-- Applied by : db/scripts/apply-migrations.ts

-- ─────────────────────────────────────────────────────────────────────────────
-- gym_profile
-- Branding and contact info for a gym. One-to-one with gyms.
-- Kept separate to keep the gyms table lean.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE gym_profile (
  id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id           UUID         NOT NULL REFERENCES gyms (id) ON DELETE CASCADE,
  description      TEXT,
  logo_url         VARCHAR(500),
  cover_photo_url  VARCHAR(500),
  contact_email    VARCHAR(255),
  contact_phone    VARCHAR(50),
  facebook_url     VARCHAR(500),
  instagram_url    VARCHAR(500),
  -- Theming (custom hex colors gated to GROWTH+ plans)
  primary_color    VARCHAR(7)   NOT NULL DEFAULT '#000000',
  secondary_color  VARCHAR(7)   NOT NULL DEFAULT '#ffffff',
  accent_color     VARCHAR(7)   NOT NULL DEFAULT '#FF5722',
  theme_preset     VARCHAR(50)  NOT NULL DEFAULT 'DEFAULT',
  -- 'DEFAULT' | 'DARK' | 'BOLD' | 'MINIMAL'
  updated_at       TIMESTAMPTZ  NOT NULL DEFAULT now(),

  CONSTRAINT gym_profile_gym_id_unique UNIQUE (gym_id),
  CONSTRAINT gym_profile_theme_check   CHECK (theme_preset IN ('DEFAULT', 'DARK', 'BOLD', 'MINIMAL'))
);

-- ─────────────────────────────────────────────────────────────────────────────
-- gym_schedules
-- Operating hours per gym per day of week.
-- A gym has exactly 7 rows (one per day), auto-created with the gym.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE gym_schedules (
  id          UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id      UUID    NOT NULL REFERENCES gyms (id) ON DELETE CASCADE,
  day_of_week INT     NOT NULL,
  -- 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  open_time   TIME,
  -- null when is_closed = true
  close_time  TIME,
  -- null when is_closed = true
  is_closed   BOOLEAN NOT NULL DEFAULT false,

  CONSTRAINT gym_schedules_gym_day_unique  UNIQUE (gym_id, day_of_week),
  CONSTRAINT gym_schedules_day_range_check CHECK (day_of_week BETWEEN 0 AND 6)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- gym_features
-- Per-gym feature flags for optional integrations and add-ons.
-- Feature must be included in the org's plan before it can be enabled here.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE gym_features (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id      UUID         NOT NULL REFERENCES gyms (id) ON DELETE CASCADE,
  feature_key VARCHAR(100) NOT NULL,
  -- e.g. 'community_chat' | 'ai_assistant' | 'advanced_reports'
  is_enabled  BOOLEAN      NOT NULL DEFAULT false,
  config      JSONB        NOT NULL DEFAULT '{}',
  -- Feature-specific config e.g. { "webhook_url": "https://..." }
  enabled_at  TIMESTAMPTZ,

  CONSTRAINT gym_features_gym_key_unique UNIQUE (gym_id, feature_key)
);
