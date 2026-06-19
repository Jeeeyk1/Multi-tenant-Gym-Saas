-- ─── Badge Catalog ────────────────────────────────────────────────────────────
-- System-wide predefined badge definitions. Seeded below, never mutated at runtime.
CREATE TABLE badge_catalog (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  key             VARCHAR(50) UNIQUE NOT NULL,
  name            VARCHAR(100) NOT NULL,
  description     TEXT,
  icon            VARCHAR(50)  NOT NULL,
  color           VARCHAR(7)   NOT NULL DEFAULT '#0D9488',
  criteria_type   VARCHAR(30)  NOT NULL,  -- BadgeCriteriaType enum value
  criteria_value  INTEGER,                -- threshold (e.g. 10 sessions, 7-day streak)
  is_auto_awarded BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ─── Gym Badge Settings ────────────────────────────────────────────────────────
-- Gyms can disable individual predefined badges. Absence = enabled (opt-out model).
CREATE TABLE gym_badge_settings (
  gym_id            UUID    NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  badge_catalog_id  UUID    NOT NULL REFERENCES badge_catalog(id) ON DELETE CASCADE,
  is_enabled        BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (gym_id, badge_catalog_id)
);

-- ─── Gym Custom Badges ────────────────────────────────────────────────────────
-- Staff-created one-off badges ("Mr Bench Press 100kg", event winners, etc.)
CREATE TABLE gym_custom_badges (
  id                  UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id              UUID         NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  name                VARCHAR(100) NOT NULL,
  description         TEXT,
  icon                VARCHAR(50)  NOT NULL DEFAULT 'trophy',
  color               VARCHAR(7)   NOT NULL DEFAULT '#F59E0B',
  created_by_user_id  UUID         NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  is_active           BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ─── Exercise Milestone Badges ────────────────────────────────────────────────
-- Auto-awarded when a PR submission for the linked exercise is approved
-- at or above the weight threshold.
CREATE TABLE exercise_milestone_badges (
  id                  UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id              UUID           NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  exercise_id         UUID           NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  badge_name          VARCHAR(100)   NOT NULL,
  description         TEXT,
  weight_kg           DECIMAL(6, 2)  NOT NULL,
  icon                VARCHAR(50)    NOT NULL DEFAULT 'barbell',
  color               VARCHAR(7)     NOT NULL DEFAULT '#F59E0B',
  is_active           BOOLEAN        NOT NULL DEFAULT TRUE,
  created_by_user_id  UUID           NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at          TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

-- ─── Leaderboard Cycles ───────────────────────────────────────────────────────
-- Bi-weekly competitive periods. A cron job closes the active cycle,
-- awards top-3 badges, and opens a new one.
CREATE TABLE leaderboard_cycles (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id      UUID        NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  started_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at    TIMESTAMPTZ,
  status      VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',  -- ACTIVE | COMPLETED
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Member Badges ────────────────────────────────────────────────────────────
-- Earned badges per member. Exactly one of badge_catalog_id / custom_badge_id /
-- milestone_badge_id must be non-null.
CREATE TABLE member_badges (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id           UUID        NOT NULL REFERENCES gym_members(id) ON DELETE CASCADE,
  gym_id              UUID        NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  badge_catalog_id    UUID        REFERENCES badge_catalog(id) ON DELETE SET NULL,
  custom_badge_id     UUID        REFERENCES gym_custom_badges(id) ON DELETE SET NULL,
  milestone_badge_id  UUID        REFERENCES exercise_milestone_badges(id) ON DELETE SET NULL,
  cycle_id            UUID        REFERENCES leaderboard_cycles(id) ON DELETE SET NULL,
  source              VARCHAR(20) NOT NULL,   -- BadgeSource enum value
  badge_rank          VARCHAR(10),            -- GOLD | SILVER | BRONZE (cycle badges only)
  awarded_by_user_id  UUID        REFERENCES users(id) ON DELETE SET NULL,
  proof_url           TEXT,
  proof_notes         TEXT,
  expires_at          TIMESTAMPTZ,            -- NULL = permanent
  is_equipped         BOOLEAN     NOT NULL DEFAULT FALSE,
  awarded_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT member_badges_one_type CHECK (
    (badge_catalog_id   IS NOT NULL)::INT +
    (custom_badge_id    IS NOT NULL)::INT +
    (milestone_badge_id IS NOT NULL)::INT = 1
  )
);

-- ─── Indexes ──────────────────────────────────────────────────────────────────
CREATE INDEX idx_member_badges_member_id      ON member_badges(member_id);
CREATE INDEX idx_member_badges_gym_id         ON member_badges(gym_id);
CREATE INDEX idx_member_badges_expires_at     ON member_badges(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX idx_gym_custom_badges_gym_id     ON gym_custom_badges(gym_id);
CREATE INDEX idx_exercise_milestones_gym_id   ON exercise_milestone_badges(gym_id);
CREATE INDEX idx_exercise_milestones_ex_id    ON exercise_milestone_badges(exercise_id);
CREATE INDEX idx_leaderboard_cycles_gym_id    ON leaderboard_cycles(gym_id);
CREATE INDEX idx_leaderboard_cycles_status    ON leaderboard_cycles(status);

-- ─── Seed: Badge Catalog ──────────────────────────────────────────────────────
INSERT INTO badge_catalog (key, name, description, icon, color, criteria_type, criteria_value, is_auto_awarded) VALUES
  ('FIRST_STEP',       'First Step',         'Complete your first workout session',             'footsteps',    '#0D9488', 'SESSION_COUNT',     1,   TRUE),
  ('GETTING_STARTED',  'Getting Started',    'Complete 5 workout sessions',                     'barbell',      '#0D9488', 'SESSION_COUNT',     5,   TRUE),
  ('GETTING_SERIOUS',  'Getting Serious',    'Complete 10 workout sessions',                    'barbell',      '#0891B2', 'SESSION_COUNT',     10,  TRUE),
  ('DEDICATED',        'Dedicated',          'Complete 25 workout sessions',                    'flame',        '#F97316', 'SESSION_COUNT',     25,  TRUE),
  ('CENTURY',          'Century Club',       'Complete 100 workout sessions',                   'trophy',       '#F59E0B', 'SESSION_COUNT',     100, TRUE),
  ('ON_FIRE',          'On Fire',            '7-day check-in streak',                           'flame',        '#EF4444', 'CHECKIN_STREAK',    7,   TRUE),
  ('UNSTOPPABLE',      'Unstoppable',        '14-day check-in streak',                          'flash',        '#EF4444', 'CHECKIN_STREAK',    14,  TRUE),
  ('GRIND_MODE',       'Grind Mode',         '30-day check-in streak',                          'rocket',       '#8B5CF6', 'CHECKIN_STREAK',    30,  TRUE),
  ('MR_MS_CONSISTENT', 'Mr/Ms Consistent',   'Work out every week for 4 weeks in a row',        'calendar',     '#10B981', 'WEEKLY_CONSISTENT', 4,   TRUE),
  ('IRON_HABIT',       'Iron Habit',         'Work out every week for 12 weeks in a row',       'medal',        '#F59E0B', 'WEEKLY_CONSISTENT', 12,  TRUE),
  ('EARLY_BIRD',       'Early Bird',         'Check in before 7 AM at least 10 times',          'sunny',        '#FBBF24', 'EARLY_BIRD',        10,  TRUE),
  ('NIGHT_OWL',        'Night Owl',          'Check in after 8 PM at least 10 times',           'moon',         '#6366F1', 'NIGHT_OWL',         10,  TRUE),
  ('ALL_ROUNDER',      'All-Rounder',        'Log 4 different workout types',                   'grid',         '#0891B2', 'WORKOUT_VARIETY',   4,   TRUE),
  ('FOUNDING_MEMBER',  'Founding Member',    'One of the first members of the gym',             'star',         '#F59E0B', 'FOUNDING_MEMBER',   30,  TRUE);
