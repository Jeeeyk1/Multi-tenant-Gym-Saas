-- Migration : 0010_gym_members
-- Description: Members domain — gym_members, member_privacy, membership_renewals
-- Applied by : db/scripts/apply-migrations.ts

-- ─────────────────────────────────────────────────────────────────────────────
-- gym_members
-- The gym-specific membership record for a user.
-- One user belongs to exactly one gym.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE gym_members (
  id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id             UUID        NOT NULL REFERENCES gyms (id) ON DELETE CASCADE,
  user_id            UUID        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  membership_plan_id UUID        REFERENCES membership_plans (id) ON DELETE SET NULL,
  -- SET NULL: keep member record if plan is deleted
  promo_id           UUID        REFERENCES plan_promos (id) ON DELETE SET NULL,
  -- null if no promo was applied at enrollment
  membership_number  VARCHAR(50) NOT NULL,
  -- Globally unique human-readable ID e.g. 'GYM-001234'
  -- Auto-generated on registration
  status             VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
  -- 'ACTIVE' | 'EXPIRED' | 'SUSPENDED'
  qr_code_token      VARCHAR(255) NOT NULL,
  -- Member's personal QR. Staff scans this to check in.
  -- Generated with: crypto.randomBytes(32).toString('hex')
  expiry_date        DATE        NOT NULL,
  -- Calculated as: today + membership_plan.duration_days
  -- Uses DATE not TIMESTAMPTZ — expiry is a calendar date, not a moment
  joined_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT gym_members_gym_user_unique     UNIQUE (gym_id, user_id),
  CONSTRAINT gym_members_number_unique       UNIQUE (membership_number),
  CONSTRAINT gym_members_qr_unique           UNIQUE (qr_code_token),
  CONSTRAINT gym_members_status_check        CHECK (status IN ('ACTIVE', 'EXPIRED', 'SUSPENDED'))
);

-- ─────────────────────────────────────────────────────────────────────────────
-- member_privacy
-- Per-member privacy settings. One-to-one with gym_members.
-- Auto-created with defaults on member registration.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE member_privacy (
  id                      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id               UUID        NOT NULL REFERENCES gym_members (id) ON DELETE CASCADE,
  hide_checkin_visibility BOOLEAN     NOT NULL DEFAULT false,
  -- If true, exclude from "who's currently checked in" visible to other members
  hide_from_member_list   BOOLEAN     NOT NULL DEFAULT false,
  -- If true, exclude from staff member search
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT member_privacy_member_unique UNIQUE (member_id)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- membership_renewals
-- Audit log for every renewal. Never delete.
-- Powers reports and dispute resolution.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE membership_renewals (
  id              UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id       UUID           NOT NULL REFERENCES gym_members (id) ON DELETE RESTRICT,
  previous_expiry DATE           NOT NULL,
  new_expiry      DATE           NOT NULL,
  amount_paid     DECIMAL(10, 2) NOT NULL,
  payment_method  VARCHAR(50),
  -- 'CASH' | 'GCASH' | 'CARD' | 'BANK_TRANSFER'
  renewed_by      UUID           NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
  -- The staff member who processed the renewal
  notes           TEXT,
  renewed_at      TIMESTAMPTZ    NOT NULL DEFAULT now(),

  CONSTRAINT membership_renewals_amount_check CHECK (amount_paid >= 0)
);
