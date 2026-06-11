-- Migration: 0018_weight_logs
-- Description: Weight log entries per gym member for fitness tracking and AI context.

CREATE TABLE member_weight_logs (
  id         UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id  UUID         NOT NULL REFERENCES gym_members(id) ON DELETE CASCADE,
  weight_kg  NUMERIC(5,2) NOT NULL CHECK (weight_kg > 0 AND weight_kg < 1000),
  notes      TEXT,
  logged_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_member_weight_logs_member_id ON member_weight_logs(member_id);
CREATE INDEX idx_member_weight_logs_logged_at ON member_weight_logs(member_id, logged_at DESC);
