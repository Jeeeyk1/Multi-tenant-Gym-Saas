-- Migration : 0008_plans_subscriptions
-- Description: Billing domain — plans, plan_features, subscriptions, invoices
-- Applied by : db/scripts/apply-migrations.ts

-- ─────────────────────────────────────────────────────────────────────────────
-- plans
-- SaaS subscription tiers. Seeded once, rarely changed.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE plans (
  id                     UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  name                   VARCHAR(100)   NOT NULL,
  tier                   VARCHAR(50)    NOT NULL,
  -- 'BASIC' | 'GROWTH' | 'ENTERPRISE'
  description            TEXT,
  max_gyms               INT            NOT NULL DEFAULT 1,
  -- -1 = unlimited
  max_members_per_gym    INT            NOT NULL DEFAULT 100,
  -- -1 = unlimited
  ai_token_quota_monthly INT            NOT NULL DEFAULT 0,
  price_monthly          DECIMAL(10, 2) NOT NULL,
  price_yearly           DECIMAL(10, 2),
  is_active              BOOLEAN        NOT NULL DEFAULT true,
  created_at             TIMESTAMPTZ    NOT NULL DEFAULT now(),

  CONSTRAINT plans_tier_check CHECK (tier IN ('BASIC', 'GROWTH', 'ENTERPRISE'))
);

-- ─────────────────────────────────────────────────────────────────────────────
-- plan_features
-- Feature flags per plan. Adding a new feature requires no schema migration.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE plan_features (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id     UUID         NOT NULL REFERENCES plans (id) ON DELETE CASCADE,
  feature_key VARCHAR(100) NOT NULL,
  -- e.g. 'community_chat' | 'ai_assistant' | 'advanced_reports'
  is_included BOOLEAN      NOT NULL DEFAULT false,
  limits      JSONB,
  -- e.g. { "max_pinned_announcements": 5 }

  CONSTRAINT plan_features_plan_key_unique UNIQUE (plan_id, feature_key)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- subscriptions
-- Live billing state for an organization.
-- One active subscription per org at a time.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE subscriptions (
  id                   UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id      UUID           NOT NULL REFERENCES organizations (id) ON DELETE RESTRICT,
  plan_id              UUID           NOT NULL REFERENCES plans (id) ON DELETE RESTRICT,
  status               VARCHAR(50)    NOT NULL DEFAULT 'TRIALING',
  -- 'TRIALING' | 'ACTIVE' | 'PAST_DUE' | 'CANCELLED'
  billing_cycle        VARCHAR(20)    NOT NULL DEFAULT 'MONTHLY',
  -- 'MONTHLY' | 'YEARLY'
  ai_tokens_used       INT            NOT NULL DEFAULT 0,
  -- Running counter for current period. Reset when period rolls over.
  current_period_start TIMESTAMPTZ    NOT NULL,
  current_period_end   TIMESTAMPTZ    NOT NULL,
  cancelled_at         TIMESTAMPTZ,
  created_at           TIMESTAMPTZ    NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ    NOT NULL DEFAULT now(),

  CONSTRAINT subscriptions_status_check        CHECK (status IN ('TRIALING', 'ACTIVE', 'PAST_DUE', 'CANCELLED')),
  CONSTRAINT subscriptions_billing_cycle_check CHECK (billing_cycle IN ('MONTHLY', 'YEARLY'))
);

-- ─────────────────────────────────────────────────────────────────────────────
-- invoices
-- Billing paper trail for SaaS subscription payments. Never delete.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE invoices (
  id              UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID           NOT NULL REFERENCES organizations (id) ON DELETE RESTRICT,
  subscription_id UUID           REFERENCES subscriptions (id) ON DELETE SET NULL,
  invoice_number  VARCHAR(50)    NOT NULL,
  -- Format: 'INV-YYYY-NNNNN' e.g. 'INV-2026-00042'
  status          VARCHAR(50)    NOT NULL DEFAULT 'OPEN',
  -- 'DRAFT' | 'OPEN' | 'PAID' | 'VOID'
  amount          DECIMAL(10, 2) NOT NULL,
  currency        VARCHAR(10)    NOT NULL DEFAULT 'PHP',
  payment_method  VARCHAR(50),
  -- 'STRIPE' | 'GCASH' | 'BANK_TRANSFER' | 'CASH'
  line_items      JSONB          NOT NULL DEFAULT '[]',
  -- [{ "description": "Growth Plan - Monthly", "amount": 1299.00 }]
  paid_at         TIMESTAMPTZ,
  due_at          TIMESTAMPTZ,
  created_at      TIMESTAMPTZ    NOT NULL DEFAULT now(),

  CONSTRAINT invoices_number_unique  UNIQUE (invoice_number),
  CONSTRAINT invoices_status_check   CHECK (status IN ('DRAFT', 'OPEN', 'PAID', 'VOID'))
);
