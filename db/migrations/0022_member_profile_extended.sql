-- Migration : 0022_member_profile_extended
-- Description: Extended member profile fields for personalised AI features
-- Applied by : db/scripts/apply-migrations.ts

ALTER TABLE member_profiles
  ADD COLUMN IF NOT EXISTS target_weight_kg  DECIMAL(5,2),
  ADD COLUMN IF NOT EXISTS days_per_week     SMALLINT        CHECK (days_per_week BETWEEN 1 AND 7),
  ADD COLUMN IF NOT EXISTS experience_level  VARCHAR(50),
  ADD COLUMN IF NOT EXISTS preferred_style   VARCHAR(50),
  ADD COLUMN IF NOT EXISTS diet_type         VARCHAR(50)     NOT NULL DEFAULT 'NONE',
  ADD COLUMN IF NOT EXISTS injuries          TEXT;
