-- Migration : 0021_food_logs
-- Description: AI feature — member food/meal diary
-- Applied by : db/scripts/apply-migrations.ts

CREATE TABLE member_food_logs (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id   UUID         NOT NULL REFERENCES gym_members(id) ON DELETE CASCADE,
  description TEXT         NOT NULL,
  photo_url   TEXT,
  calories    INT,
  protein_g   DECIMAL(6,2),
  carbs_g     DECIMAL(6,2),
  fat_g       DECIMAL(6,2),
  logged_at   TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX idx_food_logs_member_logged ON member_food_logs(member_id, logged_at DESC);
