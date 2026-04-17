-- Migration : 0004_gyms
-- Description: Gym domain — gyms
-- Applied by : db/scripts/apply-migrations.ts

-- ─────────────────────────────────────────────────────────────────────────────
-- gyms
-- A physical gym branch. One organization can own many gyms.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE gyms (
  id                  UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id     UUID         NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
  name                VARCHAR(255) NOT NULL,
  code                VARCHAR(12)  NOT NULL,
  -- 12-char uppercase alphanumeric. Auto-generated from gym name.
  -- Used as the entry point for gym-level login.
  -- Not changeable after creation.
  address             TEXT,
  city                VARCHAR(100),
  country             VARCHAR(100) NOT NULL DEFAULT 'Philippines',
  timezone            VARCHAR(100) NOT NULL DEFAULT 'Asia/Manila',
  status              VARCHAR(50)  NOT NULL DEFAULT 'ACTIVE',
  -- 'ACTIVE' | 'INACTIVE' | 'SUSPENDED'
  checkin_qr_token    VARCHAR(255),
  -- The gym's wall QR token. Members scan this to self-check in.
  -- Rotatable by manager.
  is_247              BOOLEAN      NOT NULL DEFAULT false,
  -- If true, skip all schedule validation on check-ins.
  auto_checkout_hours INT          NOT NULL DEFAULT 5,
  -- Hours after check-in before AutoCheckoutJob closes it automatically.
  -- Configurable per gym.
  auto_suspend_months INT          NOT NULL DEFAULT 3,
  -- Months after expiry_date before AutoSuspendJob moves status to SUSPENDED.
  -- Configurable per gym.
  created_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),

  CONSTRAINT gyms_code_unique         UNIQUE (code),
  CONSTRAINT gyms_qr_token_unique     UNIQUE (checkin_qr_token),
  CONSTRAINT gyms_status_check        CHECK (status IN ('ACTIVE', 'INACTIVE', 'SUSPENDED')),
  CONSTRAINT gyms_auto_checkout_check CHECK (auto_checkout_hours > 0),
  CONSTRAINT gyms_auto_suspend_check  CHECK (auto_suspend_months > 0)
);
