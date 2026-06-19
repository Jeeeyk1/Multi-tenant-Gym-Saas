-- Stores the latest AI-generated workout plan per member.
-- Upserted on every generation so there is always at most one row per member.

CREATE TABLE member_workout_plans (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id       UUID        NOT NULL REFERENCES gym_members(id) ON DELETE CASCADE,
  gym_id          UUID        NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  suggestion      TEXT        NOT NULL,
  generated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_member_workout_plan UNIQUE (member_id)
);

CREATE INDEX idx_member_workout_plans_member ON member_workout_plans(member_id);
