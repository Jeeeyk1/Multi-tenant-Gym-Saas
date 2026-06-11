-- Migration: 0023_leaderboard
-- Creates the exercise library, gym leaderboard config, and PR submission tables

-- Global + gym-specific exercise library
-- gym_id NULL  → global (platform-seeded)
-- gym_id NOT NULL → gym-specific exercise
CREATE TABLE exercises (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         VARCHAR(120) NOT NULL,
  category     VARCHAR(50)  NOT NULL,
  gym_id       UUID REFERENCES gyms(id) ON DELETE CASCADE,
  is_active    BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

  -- Global exercises must be unique by name; gym exercises unique within that gym
  UNIQUE NULLS NOT DISTINCT (name, gym_id)
);

CREATE INDEX idx_exercises_gym_id   ON exercises(gym_id);
CREATE INDEX idx_exercises_category ON exercises(category);

-- Which exercises each gym has enabled for their leaderboard
CREATE TABLE gym_leaderboard_exercises (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id             UUID        NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  exercise_id        UUID        NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  display_order      SMALLINT    NOT NULL DEFAULT 0,
  is_active          BOOLEAN     NOT NULL DEFAULT TRUE,
  enabled_by_user_id UUID        REFERENCES users(id) ON DELETE SET NULL,
  enabled_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (gym_id, exercise_id)
);

CREATE INDEX idx_gym_leaderboard_exercises_gym ON gym_leaderboard_exercises(gym_id);

-- Member PR submissions
CREATE TABLE member_pr_submissions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id              UUID           NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  member_id           UUID           NOT NULL REFERENCES gym_members(id) ON DELETE CASCADE,
  exercise_id         UUID           NOT NULL REFERENCES exercises(id) ON DELETE RESTRICT,
  weight_kg           DECIMAL(7, 2)  NOT NULL,
  reps                SMALLINT       NOT NULL CHECK (reps >= 1 AND reps <= 60),
  estimated_1rm       DECIMAL(7, 2)  NOT NULL,  -- computed at insert: weight * (1 + reps/30)
  photo_url           TEXT           NOT NULL,
  status              VARCHAR(20)    NOT NULL DEFAULT 'PENDING'
                        CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
  submission_type     VARCHAR(10)    NOT NULL DEFAULT 'SELF'
                        CHECK (submission_type IN ('SELF', 'STAFF')),
  submitted_by_user_id UUID          NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  notes               TEXT,
  reviewed_by_user_id UUID          REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at         TIMESTAMPTZ,
  rejection_reason    TEXT,
  submitted_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_pr_submissions_gym        ON member_pr_submissions(gym_id);
CREATE INDEX idx_pr_submissions_member     ON member_pr_submissions(member_id);
CREATE INDEX idx_pr_submissions_exercise   ON member_pr_submissions(exercise_id);
CREATE INDEX idx_pr_submissions_status     ON member_pr_submissions(status);
-- Fast leaderboard query: best approved 1RM per member per exercise
CREATE INDEX idx_pr_submissions_leaderboard
  ON member_pr_submissions(gym_id, exercise_id, estimated_1rm DESC)
  WHERE status = 'APPROVED';
