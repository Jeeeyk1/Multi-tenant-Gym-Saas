-- Migration : 0053_ai_cost_caps
-- Description: AI is our cost, so each gym gets a monthly AI allowance by plan tier.
--              1. ai_usage_log records the model, input/output tokens and what each call cost
--                 (US micro-dollars, from apps/api/src/common/adapters/ai/ai-pricing.ts).
--              2. Each billing plan has two monthly caps per gym: the staff AI assistant and the
--                 members' AI (workouts, meals). Editable per plan; defaults below.
--              3. Staff get the AI assistant for operational questions. Revenue tools stay with
--                 the owner (they need reports.view), enforced in the API.
-- Applied by : db/scripts/apply-migrations.ts

-- 1. Usage cost --------------------------------------------------------------------------

ALTER TABLE ai_usage_log
  ADD COLUMN IF NOT EXISTS model           VARCHAR(100),
  ADD COLUMN IF NOT EXISTS input_tokens    INTEGER NOT NULL DEFAULT 0 CHECK (input_tokens >= 0),
  ADD COLUMN IF NOT EXISTS output_tokens   INTEGER NOT NULL DEFAULT 0 CHECK (output_tokens >= 0),
  ADD COLUMN IF NOT EXISTS cost_usd_micros INTEGER NOT NULL DEFAULT 0 CHECK (cost_usd_micros >= 0);

-- Monthly totals per gym and pool.
CREATE INDEX IF NOT EXISTS idx_ai_usage_log_gym_feature_used
  ON ai_usage_log (gym_id, feature_key, used_at);

-- 2. Caps per plan (micro-dollars per gym per month) --------------------------------------

ALTER TABLE plans
  ADD COLUMN IF NOT EXISTS assistant_ai_cap_usd_micros INTEGER NOT NULL DEFAULT 2500000 CHECK (assistant_ai_cap_usd_micros >= 0),
  ADD COLUMN IF NOT EXISTS member_ai_cap_usd_micros    INTEGER NOT NULL DEFAULT 3500000 CHECK (member_ai_cap_usd_micros >= 0);

UPDATE plans SET assistant_ai_cap_usd_micros = 1500000, member_ai_cap_usd_micros = 2000000 WHERE tier = 'BASIC';
UPDATE plans SET assistant_ai_cap_usd_micros = 2500000, member_ai_cap_usd_micros = 3500000 WHERE tier IN ('STANDARD', 'GROWTH');
UPDATE plans SET assistant_ai_cap_usd_micros = 5000000, member_ai_cap_usd_micros = 7000000 WHERE tier IN ('PRO', 'ENTERPRISE');

-- 3. Staff get the assistant --------------------------------------------------------------

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.key = 'insights.query'
WHERE r.name = 'STAFF'
ON CONFLICT (role_id, permission_id) DO NOTHING;
