-- Stores the latest AI-generated meal plan per member.
-- Mirrors member_workout_plans (0024): upserted on every generation so there is
-- always at most one row per member, and the plan survives app navigation/reopen
-- instead of living only in mobile component state.

CREATE TABLE member_meal_plans (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id       UUID        NOT NULL REFERENCES gym_members(id) ON DELETE CASCADE,
  gym_id          UUID        NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  suggestion      TEXT        NOT NULL,
  generated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_member_meal_plan UNIQUE (member_id)
);

CREATE INDEX idx_member_meal_plans_member ON member_meal_plans(member_id);
