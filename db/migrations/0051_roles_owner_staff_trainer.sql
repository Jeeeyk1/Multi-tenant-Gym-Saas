-- Migration : 0051_roles_owner_staff_trainer
-- Description: Gym roles become OWNER, STAFF and TRAINER.
--              1. GYM_OWNER → OWNER. MANAGER → STAFF, and FRONT_DESK holders move to STAFF.
--              2. New permission members.details: contact details, plan, prices and payments.
--                 Trainers don't get it; they see members' name and status only.
--              3. Role permissions are rebuilt for the three roles (matrix below; the same
--                 matrix is in db/seeds/003_role_permissions.sql for fresh databases).
-- Applied by : db/scripts/apply-migrations.ts
-- Note       : on a fresh database only GYM_OWNER (0029) and a few permissions exist yet: this renames
--              GYM_OWNER, creates STAFF and TRAINER, and grants what exists; the seeds (run after
--              migrations) add the rest. Safe to re-run.

-- 1. Roles ------------------------------------------------------------------------------

UPDATE roles SET name = 'OWNER', description = 'Owner: everything, including billing, staff and settings'
WHERE name = 'GYM_OWNER'
  AND NOT EXISTS (SELECT 1 FROM roles WHERE name = 'OWNER');

UPDATE roles SET name = 'STAFF', description = 'Staff: front desk, members, renewals and the community'
WHERE name = 'MANAGER'
  AND NOT EXISTS (SELECT 1 FROM roles WHERE name = 'STAFF');

INSERT INTO roles (name, description, is_system_role) VALUES
  ('OWNER',   'Owner: everything, including billing, staff and settings', true),
  ('STAFF',   'Staff: front desk, members, renewals and the community',   true),
  ('TRAINER', 'Trainer: check-ins, the community and coach tools (app only)', true)
ON CONFLICT (name) DO NOTHING;

UPDATE roles SET description = 'Trainer: check-ins, the community and coach tools (app only)'
WHERE name = 'TRAINER';

-- FRONT_DESK holders become STAFF, then the old roles go.
INSERT INTO gym_staff_roles (gym_staff_id, role_id, assigned_at, assigned_by)
SELECT gsr.gym_staff_id, staff.id, gsr.assigned_at, gsr.assigned_by
FROM gym_staff_roles gsr
JOIN roles old ON old.id = gsr.role_id AND old.name IN ('FRONT_DESK', 'MANAGER', 'GYM_OWNER')
JOIN roles staff ON staff.name = CASE old.name WHEN 'GYM_OWNER' THEN 'OWNER' ELSE 'STAFF' END
ON CONFLICT (gym_staff_id, role_id) DO NOTHING;

-- gym_staff_roles.role_id is ON DELETE RESTRICT: drop the old assignments first.
DELETE FROM gym_staff_roles
WHERE role_id IN (SELECT id FROM roles WHERE name IN ('FRONT_DESK', 'MANAGER', 'GYM_OWNER'));

DELETE FROM roles WHERE name IN ('FRONT_DESK', 'MANAGER', 'GYM_OWNER');

-- 2. Permission -------------------------------------------------------------------------

INSERT INTO permissions (key, description, module)
VALUES ('members.details', 'See members'' contact details, plan, prices and payments', 'Members')
ON CONFLICT (key) DO NOTHING;

-- 3. Role permissions -------------------------------------------------------------------

DELETE FROM role_permissions
WHERE role_id IN (SELECT id FROM roles WHERE name IN ('OWNER', 'STAFF', 'TRAINER'));

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON (
  r.name = 'OWNER'
  OR (r.name = 'STAFF' AND p.key IN (
    'members.view', 'members.details', 'members.create', 'members.edit', 'members.renew', 'members.suspend',
    'checkins.view', 'checkins.manage',
    'announcements.manage',
    'chat.manage',
    'plans.view',
    'leaderboard.view', 'leaderboard.submit', 'leaderboard.review', 'leaderboard.manage',
    'badges.award'
  ))
  OR (r.name = 'TRAINER' AND p.key IN (
    'members.view',
    'checkins.view', 'checkins.manage',
    'chat.manage',
    'leaderboard.view', 'leaderboard.submit', 'leaderboard.review',
    'badges.award'
  ))
)
ON CONFLICT (role_id, permission_id) DO NOTHING;
