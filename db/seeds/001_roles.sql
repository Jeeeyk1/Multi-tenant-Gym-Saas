-- Seed : 001_roles
-- Description: Gym staff roles. Keep in sync with StaffRole (apps/api/src/common/enums/staff-role.enum.ts)
--              and migration 0051_roles_owner_staff_trainer.
-- Idempotent: uses INSERT ... ON CONFLICT DO NOTHING

INSERT INTO roles (name, description, is_system_role) VALUES
  ('OWNER',   'Owner: everything, including billing, staff and settings',     true),
  ('STAFF',   'Staff: front desk, members, renewals and the community',       true),
  ('TRAINER', 'Trainer: check-ins, the community and coach tools (app only)', true)
ON CONFLICT (name) DO NOTHING;
