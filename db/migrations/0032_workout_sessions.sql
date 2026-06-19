-- Migration: 0032_workout_sessions
-- Description: Workout sessions recorded by members from the mobile app

CREATE TABLE workout_sessions (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id       UUID        NOT NULL REFERENCES gym_members(id) ON DELETE CASCADE,
  gym_id          UUID        NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  workout_type    VARCHAR(50) NOT NULL,
  started_at      TIMESTAMPTZ NOT NULL,
  ended_at        TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER    NOT NULL,
  calories_burned INTEGER     NULL,
  avg_heart_rate  INTEGER     NULL,
  source          VARCHAR(20) NOT NULL DEFAULT 'manual',
  notes           TEXT        NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_workout_sessions_member_id  ON workout_sessions(member_id);
CREATE INDEX idx_workout_sessions_gym_id     ON workout_sessions(gym_id);
CREATE INDEX idx_workout_sessions_started_at ON workout_sessions(started_at DESC);
