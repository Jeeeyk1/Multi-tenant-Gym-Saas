-- Migration : 0040_signup_requests
-- Description: Lead capture for the landing page "Subscribe" flow. A prospect submits gym +
--              owner + plan interest; an admin reviews the queue and, on Convert, runs the
--              normal admin-provisioning flow (Flow A) and marks the request CONVERTED.
-- Idempotent : CREATE TABLE IF NOT EXISTS.

-- plan_interest is free text (the landing-page SaasPlan/tier the lead clicked), not a FK — the
-- landing page's SaasPlan (marketing tiers) and the internal Plan (what subscriptions bill
-- against) are different tables. The admin picks the real Plan when converting via Flow A.
CREATE TABLE IF NOT EXISTS signup_requests (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_name       TEXT NOT NULL,
  owner_name     TEXT NOT NULL,
  email          TEXT NOT NULL,
  phone          TEXT,
  plan_interest  TEXT,
  status         TEXT NOT NULL DEFAULT 'NEW',
  notes          TEXT,
  converted_gym_id UUID REFERENCES gyms(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_signup_requests_status ON signup_requests (status);
