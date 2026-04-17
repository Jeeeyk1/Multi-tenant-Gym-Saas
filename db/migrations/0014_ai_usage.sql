-- Migration : 0014_ai_usage
-- Description: AI domain — ai_usage_log
-- Applied by : db/scripts/apply-migrations.ts
--
-- NOTE: AI assistant feature is NOT part of MVP.
-- This table exists for future implementation without requiring a new migration.

-- ─────────────────────────────────────────────────────────────────────────────
-- ai_usage_log
-- Granular token tracking for every AI feature call.
-- Drives quota enforcement and analytics.
-- Never delete rows — append only.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE ai_usage_log (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID         NOT NULL REFERENCES organizations (id) ON DELETE RESTRICT,
  gym_id          UUID         REFERENCES gyms (id) ON DELETE SET NULL,
  user_id         UUID         REFERENCES users (id) ON DELETE SET NULL,
  feature_key     VARCHAR(100) NOT NULL,
  -- e.g. 'ai_chat_assistant' | 'ai_report_summary' | 'ai_member_insights'
  tokens_used     INT          NOT NULL,
  metadata        JSONB        NOT NULL DEFAULT '{}',
  -- { "prompt_tokens": 150, "completion_tokens": 80, "model": "claude-sonnet-4-6" }
  used_at         TIMESTAMPTZ  NOT NULL DEFAULT now(),

  CONSTRAINT ai_usage_log_tokens_check CHECK (tokens_used > 0)
);
