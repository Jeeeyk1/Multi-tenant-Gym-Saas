-- Migration : 0016_member_profiles
-- Description: Member fitness profile for onboarding data and AI feature context.
--              One row per gym_member, created on first onboarding save.

CREATE TABLE member_profiles (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id        UUID        NOT NULL UNIQUE REFERENCES gym_members(id) ON DELETE CASCADE,

  -- Onboarding fields
  age              SMALLINT    CHECK (age > 0 AND age < 120),
  weight_kg        NUMERIC(5,2) CHECK (weight_kg > 0),
  height_cm        SMALLINT    CHECK (height_cm > 0),
  fitness_goal     TEXT        CHECK (fitness_goal IN ('LOSE_WEIGHT','BUILD_MUSCLE','GET_FIT','STAY_HEALTHY','OTHER')),
  activity_level   TEXT        CHECK (activity_level IN ('BEGINNER','OCCASIONALLY_ACTIVE','PRETTY_ACTIVE','VERY_ACTIVE')),

  onboarding_done  BOOLEAN     NOT NULL DEFAULT FALSE,

  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_member_profiles_member_id ON member_profiles(member_id);
