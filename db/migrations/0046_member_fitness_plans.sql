-- Migration : 0046_member_fitness_plans
-- Description: Inputs and stored results for the deterministic fitness-plan calculator
--              (daily kcal / macro targets and goal date).
--              1. activity_level moves to five TDEE-based values. The old set mixed in
--                 BEGINNER, which is a training-experience level, not daily activity.
--              2. member_profiles gains sex (calorie formula), unit_system (display only),
--                 health_caution and health_data_consent_at.
--              3. member_fitness_plans keeps every calculated plan; the newest row is the
--                 active one. Inputs are copied in so a plan can be explained later even
--                 after the profile changes.
-- Applied by : db/scripts/apply-migrations.ts

-- 1. activity_level ---------------------------------------------------------------------

ALTER TABLE member_profiles DROP CONSTRAINT IF EXISTS member_profiles_activity_level_check;

UPDATE member_profiles
SET activity_level = CASE activity_level
      WHEN 'BEGINNER'            THEN 'SEDENTARY'
      WHEN 'OCCASIONALLY_ACTIVE' THEN 'LIGHT'
      WHEN 'PRETTY_ACTIVE'       THEN 'MODERATE'
      ELSE activity_level
    END,
    updated_at = NOW()
WHERE activity_level IN ('BEGINNER', 'OCCASIONALLY_ACTIVE', 'PRETTY_ACTIVE');

ALTER TABLE member_profiles
  ADD CONSTRAINT member_profiles_activity_level_check
  CHECK (activity_level IN ('SEDENTARY', 'LIGHT', 'MODERATE', 'VERY_ACTIVE', 'ATHLETE'));

-- 2. New profile fields -----------------------------------------------------------------

ALTER TABLE member_profiles
  ADD COLUMN IF NOT EXISTS sex                   TEXT
    CONSTRAINT member_profiles_sex_check CHECK (sex IN ('MALE', 'FEMALE', 'UNSPECIFIED')),
  ADD COLUMN IF NOT EXISTS unit_system           TEXT NOT NULL DEFAULT 'METRIC'
    CONSTRAINT member_profiles_unit_system_check CHECK (unit_system IN ('METRIC', 'IMPERIAL')),
  -- Set when the member reports pregnancy or a medical condition. A single flag on
  -- purpose: the calculator only needs to know to be conservative, not why.
  ADD COLUMN IF NOT EXISTS health_caution        BOOLEAN NOT NULL DEFAULT FALSE,
  -- Explicit consent to process health data (Data Privacy Act: sensitive personal
  -- information). A plan cannot be saved while this is NULL.
  ADD COLUMN IF NOT EXISTS health_data_consent_at TIMESTAMPTZ;

-- 3. member_fitness_plans ---------------------------------------------------------------

CREATE TABLE member_fitness_plans (
  id                 UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id          UUID         NOT NULL REFERENCES gym_members(id) ON DELETE CASCADE,
  gym_id             UUID         NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  calculator_version SMALLINT     NOT NULL,

  -- Inputs at calculation time
  sex                TEXT         NOT NULL CHECK (sex IN ('MALE', 'FEMALE', 'UNSPECIFIED')),
  age                SMALLINT     NOT NULL CHECK (age BETWEEN 13 AND 100),
  height_cm          SMALLINT     NOT NULL CHECK (height_cm BETWEEN 120 AND 230),
  weight_kg          NUMERIC(5,2) NOT NULL CHECK (weight_kg BETWEEN 30 AND 300),
  target_weight_kg   NUMERIC(5,2)          CHECK (target_weight_kg BETWEEN 30 AND 300),
  activity_level     TEXT         NOT NULL
    CHECK (activity_level IN ('SEDENTARY', 'LIGHT', 'MODERATE', 'VERY_ACTIVE', 'ATHLETE')),
  fitness_goal       TEXT         NOT NULL
    CHECK (fitness_goal IN ('LOSE_WEIGHT', 'BUILD_MUSCLE', 'GET_FIT', 'STAY_HEALTHY', 'OTHER')),
  direction          TEXT         NOT NULL CHECK (direction IN ('LOSS', 'GAIN', 'MAINTAIN')),
  goal_pace          TEXT                  CHECK (goal_pace IN ('STEADY', 'BALANCED', 'FAST')),

  -- Results
  bmr_kcal           SMALLINT     NOT NULL CHECK (bmr_kcal > 0),
  tdee_kcal          SMALLINT     NOT NULL CHECK (tdee_kcal > 0),
  target_kcal        SMALLINT     NOT NULL CHECK (target_kcal > 0),
  protein_g          SMALLINT     NOT NULL CHECK (protein_g >= 0),
  carbs_g            SMALLINT     NOT NULL CHECK (carbs_g >= 0),
  fat_g              SMALLINT     NOT NULL CHECK (fat_g >= 0),
  water_ml           SMALLINT     NOT NULL CHECK (water_ml > 0),
  -- Signed: negative while losing, positive while gaining, 0 when maintaining.
  weekly_rate_kg     NUMERIC(4,2) NOT NULL,
  target_date        DATE,

  created_at         TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

  -- A pace is chosen exactly when there is a direction to move in.
  CONSTRAINT member_fitness_plans_pace_check
    CHECK ((direction = 'MAINTAIN') = (goal_pace IS NULL))
);

CREATE INDEX idx_member_fitness_plans_member_created
  ON member_fitness_plans (member_id, created_at DESC);
