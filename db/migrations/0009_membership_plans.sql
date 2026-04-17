-- Migration : 0009_membership_plans
-- Description: Members domain — membership_plans, plan_promos
-- Applied by : db/scripts/apply-migrations.ts
--
-- NOTE: plan_promos schema is defined here but NOT part of MVP logic.
-- The table exists for future implementation without requiring a new migration.

-- ─────────────────────────────────────────────────────────────────────────────
-- membership_plans
-- Gym-defined membership tiers with pricing and duration.
-- Each gym creates their own plans independently.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE membership_plans (
  id            UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id        UUID           NOT NULL REFERENCES gyms (id) ON DELETE CASCADE,
  name          VARCHAR(255)   NOT NULL,
  type          VARCHAR(50)    NOT NULL,
  -- 'MONTHLY' | 'ANNUAL' | 'STUDENT' | 'WALK_IN' | 'DAY_PASS' | 'CUSTOM'
  description   TEXT,
  price         DECIMAL(10, 2) NOT NULL,
  duration_days INT            NOT NULL,
  -- expiry_date = joined_at::date + duration_days
  -- MONTHLY = 30, ANNUAL = 365, DAY_PASS = 1
  is_active     BOOLEAN        NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ    NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ    NOT NULL DEFAULT now(),

  CONSTRAINT membership_plans_type_check CHECK (
    type IN ('MONTHLY', 'ANNUAL', 'STUDENT', 'WALK_IN', 'DAY_PASS', 'CUSTOM')
  ),
  CONSTRAINT membership_plans_price_check    CHECK (price >= 0),
  CONSTRAINT membership_plans_duration_check CHECK (duration_days > 0)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- plan_promos
-- Promo codes attached to a membership plan.
-- Schema defined. Logic NOT implemented in MVP.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE plan_promos (
  id                 UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  membership_plan_id UUID           NOT NULL REFERENCES membership_plans (id) ON DELETE CASCADE,
  name               VARCHAR(255)   NOT NULL,
  code               VARCHAR(50)    NOT NULL,
  discount_type      VARCHAR(20)    NOT NULL,
  -- 'PERCENTAGE' | 'FIXED'
  discount_value     DECIMAL(10, 2) NOT NULL,
  max_uses           INT,
  -- null = unlimited
  used_count         INT            NOT NULL DEFAULT 0,
  valid_from         TIMESTAMPTZ    NOT NULL,
  valid_until        TIMESTAMPTZ,
  -- null = no expiry
  is_active          BOOLEAN        NOT NULL DEFAULT true,
  created_at         TIMESTAMPTZ    NOT NULL DEFAULT now(),

  CONSTRAINT plan_promos_code_unique          UNIQUE (code),
  CONSTRAINT plan_promos_discount_type_check  CHECK (discount_type IN ('PERCENTAGE', 'FIXED')),
  CONSTRAINT plan_promos_discount_value_check CHECK (discount_value > 0),
  CONSTRAINT plan_promos_used_count_check     CHECK (used_count >= 0)
);
