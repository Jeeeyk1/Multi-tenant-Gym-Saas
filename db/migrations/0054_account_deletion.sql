-- Migration : 0054_account_deletion
-- Description: Members can delete their account in the app (App Store / Play requirement).
--              Deleting anonymises rather than removes: the member's personal, health and chat data
--              is deleted, but their renewals and check-ins stay (without a name) so the gym's
--              financial records still add up.
--              1. gym_members gets a DELETED status and deleted_at. The row is moved to a
--                 placeholder "Deleted member" user, so it no longer points at the person.
--              2. users gets deleted_at, set when a login itself is anonymised (a member with no
--                 staff or other gym role).
-- Applied by : db/scripts/apply-migrations.ts

ALTER TABLE gym_members
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

ALTER TABLE gym_members DROP CONSTRAINT IF EXISTS gym_members_status_check;
ALTER TABLE gym_members
  ADD CONSTRAINT gym_members_status_check CHECK (status IN ('ACTIVE', 'EXPIRED', 'SUSPENDED', 'DELETED'));

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
