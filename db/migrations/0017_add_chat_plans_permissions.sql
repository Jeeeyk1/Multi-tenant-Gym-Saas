-- Migration: 0017_add_chat_plans_permissions
-- Adds chat.manage and plans.view permissions and assigns them to roles.

-- Add missing permissions
INSERT INTO permissions (key, description, module) VALUES
  ('chat.manage',   'Send and moderate community chat messages', 'Chat'),
  ('plans.view',    'View membership plans',                     'Plans'),
  ('members.manage','Full member management (suspend, renew)',   'Members')
ON CONFLICT (key) DO NOTHING;

-- Assign to roles
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON (
  -- MANAGER gets all three
  (r.name = 'MANAGER' AND p.key IN ('chat.manage', 'plans.view', 'members.manage'))

  OR

  -- FRONT_DESK: chat + plans view + member manage (renewals, suspend)
  (r.name = 'FRONT_DESK' AND p.key IN ('chat.manage', 'plans.view', 'members.manage'))

  OR

  -- TRAINER: chat only
  (r.name = 'TRAINER' AND p.key IN ('chat.manage'))
)
ON CONFLICT (role_id, permission_id) DO NOTHING;
