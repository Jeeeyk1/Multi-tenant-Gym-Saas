-- Seed : 003_role_permissions
-- Description: Maps system roles to permissions
-- Idempotent: uses INSERT ... ON CONFLICT DO NOTHING
--
-- OWNER   → every permission
-- STAFF   → front desk, members incl. details, community, leaderboard (see below)
-- TRAINER → app only: check-ins, community, PR review, badge awarding; members' name and status only
-- Same matrix as migration 0051_roles_owner_staff_trainer; change both together.

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON (
  -- OWNER gets every permission, full stop
  r.name = 'OWNER'

  OR

  -- STAFF: front desk, members and renewals, the community, leaderboard (the owner can switch
  -- leaderboard.manage off per gym), and the AI assistant without revenue tools (migration 0053).
  -- No staff management, reports, settings or billing.
  (r.name = 'STAFF' AND p.key IN (
    'members.view', 'members.details', 'members.create', 'members.edit', 'members.renew', 'members.suspend',
    'checkins.view', 'checkins.manage',
    'announcements.manage',
    'chat.manage',
    'plans.view',
    'leaderboard.view', 'leaderboard.submit', 'leaderboard.review', 'leaderboard.manage',
    'badges.award',
    'insights.query'
  ))

  OR

  -- TRAINER (app only): check-ins, chat moderation, PR review, badge awarding. Members' name and
  -- status only: no members.details, so no contact or payment information.
  (r.name = 'TRAINER' AND p.key IN (
    'members.view',
    'checkins.view', 'checkins.manage',
    'chat.manage',
    'leaderboard.view', 'leaderboard.submit', 'leaderboard.review',
    'badges.award'
  ))
)
ON CONFLICT (role_id, permission_id) DO NOTHING;
