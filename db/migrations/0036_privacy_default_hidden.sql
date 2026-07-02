-- ─────────────────────────────────────────────────────────────────────────────
-- 0036_privacy_default_hidden.sql
-- Description: Flip the default for member_privacy.hide_checkin_visibility from
-- false to true. Member identity in the "who's currently checked in" view is now
-- hidden by default; members opt in to display their name.
-- Existing rows: forcibly set to true so no one is unexpectedly made visible
-- on launch day (no member has ever consented because there was no toggle UI).
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE member_privacy
  ALTER COLUMN hide_checkin_visibility SET DEFAULT true;

UPDATE member_privacy
  SET hide_checkin_visibility = true,
      updated_at = now()
  WHERE hide_checkin_visibility = false;
