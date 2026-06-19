-- Exercise media cache: stores ExerciseDB GIF URLs keyed by normalised exercise name
CREATE TABLE exercise_media (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  normalized_name TEXT        NOT NULL,
  gif_url         TEXT        NOT NULL,
  fetched_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_exercise_media_name UNIQUE (normalized_name)
);
