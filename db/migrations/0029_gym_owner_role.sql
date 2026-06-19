-- Migration : 0029_gym_owner_role
-- Description: Add GYM_OWNER system role and grant it all permissions.
--              This role is automatically assigned to gym owners when a gym
--              client is provisioned via the admin panel.
-- Idempotent : uses INSERT ... ON CONFLICT DO NOTHING

INSERT INTO roles (name, description, is_system_role)
VALUES ('GYM_OWNER', 'Gym owner — full access to all gym features and settings', true)
ON CONFLICT (name) DO NOTHING;

-- Grant every existing permission to GYM_OWNER.
-- New permissions added in future migrations are NOT automatically granted;
-- add them explicitly in the migration that introduces them.
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'GYM_OWNER'
ON CONFLICT (role_id, permission_id) DO NOTHING;
