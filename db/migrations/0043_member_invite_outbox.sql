-- Outbox for bulk-invite emails. Bulk member import creates the member records
-- synchronously and enqueues one row here per member; a cron drains it in batches
-- so 100+ invite emails don't block the request or blow past the email provider's
-- rate limits. Crash-safe: unsent rows survive a restart and are retried.

CREATE TABLE member_invite_outbox (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id      UUID        NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  email       TEXT        NOT NULL,
  full_name   TEXT        NOT NULL,
  token       TEXT        NOT NULL,
  attempts    INTEGER     NOT NULL DEFAULT 0,
  sent_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- The cron only ever queries unsent rows, so index just those.
CREATE INDEX idx_member_invite_outbox_pending
  ON member_invite_outbox (created_at)
  WHERE sent_at IS NULL;
