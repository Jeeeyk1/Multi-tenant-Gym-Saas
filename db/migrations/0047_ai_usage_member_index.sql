-- Migration : 0047_ai_usage_member_index
-- Description: Per-member monthly AI limits.
--              1. Index a member's usage rows by time; the limit check counts rows since
--                 the start of the month.
--              2. A usage row is now reserved (tokens_used = 0) before the AI call and
--                 filled in when the provider answers, so 0 must be allowed. It also
--                 records calls where the provider reports no token usage.
-- Applied by : db/scripts/apply-migrations.ts

CREATE INDEX IF NOT EXISTS idx_ai_usage_log_user_used
  ON ai_usage_log (user_id, used_at);

ALTER TABLE ai_usage_log DROP CONSTRAINT IF EXISTS ai_usage_log_tokens_check;
ALTER TABLE ai_usage_log ADD CONSTRAINT ai_usage_log_tokens_check CHECK (tokens_used >= 0);
