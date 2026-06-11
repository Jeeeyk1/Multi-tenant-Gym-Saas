-- Migration: 0020_notification_logs
-- Description: Tracks sent push notifications to prevent duplicate sends per user per day.

CREATE TABLE notification_logs (
  id        UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id   UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type      TEXT        NOT NULL,
  sent_date DATE        NOT NULL DEFAULT CURRENT_DATE,
  sent_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (user_id, type, sent_date)
);

CREATE INDEX idx_notification_logs_user_date ON notification_logs(user_id, sent_date);
