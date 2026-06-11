-- Seed: 006_exercises
-- Description: Global exercise library for leaderboards
-- Idempotent: uses INSERT ... ON CONFLICT DO NOTHING

INSERT INTO exercises (name, category, gym_id) VALUES
  -- Chest
  ('Bench Press',           'CHEST',     NULL),
  ('Incline Bench Press',   'CHEST',     NULL),
  ('Dumbbell Bench Press',  'CHEST',     NULL),

  -- Back
  ('Conventional Deadlift', 'BACK',      NULL),
  ('Sumo Deadlift',         'BACK',      NULL),
  ('Barbell Row',           'BACK',      NULL),
  ('Weighted Pull-up',      'BACK',      NULL),
  ('Lat Pulldown',          'BACK',      NULL),

  -- Legs
  ('Back Squat',            'LEGS',      NULL),
  ('Front Squat',           'LEGS',      NULL),
  ('Leg Press',             'LEGS',      NULL),
  ('Romanian Deadlift',     'LEGS',      NULL),
  ('Leg Curl',              'LEGS',      NULL),
  ('Leg Extension',         'LEGS',      NULL),

  -- Shoulders
  ('Overhead Press',        'SHOULDERS', NULL),
  ('Seated Dumbbell Press', 'SHOULDERS', NULL),

  -- Arms
  ('Barbell Curl',          'ARMS',      NULL),
  ('Tricep Pushdown',       'ARMS',      NULL)

ON CONFLICT (name, gym_id) DO NOTHING;
