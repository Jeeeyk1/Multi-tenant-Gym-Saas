-- SaaS subscription plans shown on the LiftHub marketing/landing page.
-- Managed by system admins. Fetched publicly via GET /public/plans.
CREATE TABLE saas_plans (
  id            UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT           NOT NULL,
  description   TEXT,
  price_monthly NUMERIC(10,2)  NOT NULL,
  price_yearly  NUMERIC(10,2),
  features      JSONB          NOT NULL DEFAULT '[]',
  is_popular    BOOLEAN        NOT NULL DEFAULT FALSE,
  is_active     BOOLEAN        NOT NULL DEFAULT TRUE,
  sort_order    INTEGER        NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);
