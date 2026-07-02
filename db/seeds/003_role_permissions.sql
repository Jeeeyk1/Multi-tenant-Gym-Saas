-- Seed : 003_role_permissions
-- Description: Maps system roles to permissions
-- Idempotent: uses INSERT ... ON CONFLICT DO NOTHING
--
-- GYM_OWNER  → every permission (see note below)
-- MANAGER    → all permissions
-- FRONT_DESK → member ops + check-ins (no reports, staff mgmt, or gym settings)
-- TRAINER    → view-only + check-ins
--
-- GYM_OWNER is created in migrations/0029_gym_owner_role.sql, which tried to grant it
-- every permission via CROSS JOIN permissions at migration time. Migrations run before
-- seeds (db:migrate && db:seed), and permissions are defined here in seeds (002), so that
-- cross join saw an empty permissions table and granted nothing. Granting GYM_OWNER
-- everything here (after permissions exist) keeps it correct, including for permissions
-- added by future migrations/seeds.

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON (
  -- GYM_OWNER gets every permission, full stop
  (r.name = 'GYM_OWNER')

  OR

  -- MANAGER gets everything
  (r.name = 'MANAGER' AND p.key IN (
    'members.view', 'members.create', 'members.edit', 'members.renew', 'members.suspend', 'members.manage',
    'checkins.view', 'checkins.manage',
    'reports.view',
    'staff.view', 'staff.manage',
    'announcements.manage',
    'chat.manage',
    'plans.view',
    'gym.settings',
    'leaderboard.view', 'leaderboard.submit', 'leaderboard.review', 'leaderboard.manage',
    'badges.manage', 'badges.award',
    'insights.query'
  ))

  OR

  -- FRONT_DESK: member operations, check-ins, chat, plans, leaderboard review, badge awarding
  (r.name = 'FRONT_DESK' AND p.key IN (
    'members.view', 'members.create', 'members.edit', 'members.renew', 'members.manage',
    'checkins.view', 'checkins.manage',
    'chat.manage',
    'plans.view',
    'leaderboard.view', 'leaderboard.submit', 'leaderboard.review',
    'badges.award'
  ))

  OR

  -- TRAINER: view members, check-ins, chat, leaderboard, badge awarding
  (r.name = 'TRAINER' AND p.key IN (
    'members.view',
    'checkins.view', 'checkins.manage',
    'chat.manage',
    'leaderboard.view', 'leaderboard.submit', 'leaderboard.review',
    'badges.award'
  ))
)
ON CONFLICT (role_id, permission_id) DO NOTHING;
