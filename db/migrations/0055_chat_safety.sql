-- Migration : 0055_chat_safety
-- Description: Community chat safety, required by App Store guideline 1.2 for user-generated content.
--              1. message_reports: anyone in the chat can report a message; staff with chat.manage
--                 review them (dismiss, or remove the message).
--              2. user_blocks: a person stops seeing someone's messages. One-way and FitOps-wide.
--              3. users.community_rules_version: the version of the community rules the person
--                 accepted. Members must accept the current version before posting.
-- Applied by : db/scripts/apply-migrations.ts

-- 1. Reports -------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS message_reports (
  id                   UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id               UUID         NOT NULL REFERENCES gyms (id) ON DELETE CASCADE,
  message_id           UUID         NOT NULL REFERENCES messages (id) ON DELETE CASCADE,
  reporter_user_id     UUID         NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  reason               VARCHAR(30)  NOT NULL,
  note                 VARCHAR(500),
  status               VARCHAR(20)  NOT NULL DEFAULT 'OPEN',
  reviewed_by_user_id  UUID         REFERENCES users (id) ON DELETE SET NULL,
  reviewed_at          TIMESTAMPTZ,
  created_at           TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

  CONSTRAINT message_reports_reason_check CHECK (reason IN ('SPAM', 'HARASSMENT', 'HATE', 'SEXUAL', 'VIOLENCE', 'OTHER')),
  CONSTRAINT message_reports_status_check CHECK (status IN ('OPEN', 'DISMISSED', 'REMOVED')),
  -- One report per person per message; reporting again is a no-op.
  CONSTRAINT message_reports_once UNIQUE (message_id, reporter_user_id)
);

-- The moderation queue: open reports for a gym, newest first.
CREATE INDEX IF NOT EXISTS idx_message_reports_queue ON message_reports (gym_id, status, created_at DESC);

-- 2. Blocks --------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS user_blocks (
  id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_user_id  UUID         NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  blocked_user_id  UUID         NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

  CONSTRAINT user_blocks_once UNIQUE (blocker_user_id, blocked_user_id),
  CONSTRAINT user_blocks_not_self CHECK (blocker_user_id <> blocked_user_id)
);

-- Who blocked this sender (to leave them out of a live message).
CREATE INDEX IF NOT EXISTS idx_user_blocks_blocked ON user_blocks (blocked_user_id);

-- 3. Community rules -------------------------------------------------------------------------

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS community_rules_version SMALLINT;
