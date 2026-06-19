-- Add category and primary_muscles to exercise_media so we can group exercises
-- for the AI workout prompt and optionally filter by experience level later.
ALTER TABLE exercise_media
  ADD COLUMN IF NOT EXISTS category        TEXT,
  ADD COLUMN IF NOT EXISTS primary_muscles TEXT;
