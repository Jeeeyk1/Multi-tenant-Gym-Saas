-- Migration : 0011_check_ins
-- Description: Check-ins domain — check_ins
-- Applied by : db/scripts/apply-migrations.ts

-- ─────────────────────────────────────────────────────────────────────────────
-- check_ins
-- Every gym visit recorded. Never hard delete.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE check_ins (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id       UUID        NOT NULL REFERENCES gym_members (id) ON DELETE RESTRICT,
  gym_id          UUID        NOT NULL REFERENCES gyms (id) ON DELETE RESTRICT,
  processed_by    UUID        REFERENCES users (id) ON DELETE SET NULL,
  -- null for self check-ins (QR_SELF_SCAN, APP_SELF_CHECKIN)
  -- staff user_id for MANUAL_STAFF and QR_STAFF_SCAN
  method          VARCHAR(50) NOT NULL,
  -- 'MANUAL_STAFF'     : staff searches member manually, no QR
  -- 'QR_STAFF_SCAN'    : staff scans member's QR code
  -- 'QR_SELF_SCAN'     : member scans gym's wall QR
  -- 'APP_SELF_CHECKIN' : member taps check-in in the app
  checked_in_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  checked_out_at  TIMESTAMPTZ,
  -- null = currently checked in
  -- A member is "in the gym" when checked_out_at IS NULL
  is_out_of_hours BOOLEAN     NOT NULL DEFAULT false,
  -- true = check-in happened outside the gym's scheduled hours
  -- check-in is NOT blocked — it is flagged for staff review
  -- always false for 24/7 gyms
  is_auto_checkout BOOLEAN    NOT NULL DEFAULT false,
  -- true = checked_out_at was set by AutoCheckoutJob, not by a user action

  CONSTRAINT check_ins_method_check CHECK (
    method IN ('MANUAL_STAFF', 'QR_STAFF_SCAN', 'QR_SELF_SCAN', 'APP_SELF_CHECKIN')
  )
);

-- ─────────────────────────────────────────────────────────────────────────────
-- DB-level guard: prevent multiple active check-ins for the same member.
-- A partial unique index on member_id where checked_out_at IS NULL ensures
-- only one open check-in can exist per member at any time.
-- This prevents race conditions even without application-level locking.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE UNIQUE INDEX ux_check_ins_member_active
  ON check_ins (member_id)
  WHERE checked_out_at IS NULL;
