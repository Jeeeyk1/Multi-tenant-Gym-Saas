-- Migration : 0031_member_delete_permission
-- Description: Add members.delete permission and grant it to GYM_OWNER.

INSERT INTO permissions (key, description, module)
VALUES ('members.delete', 'Permanently remove a member and their data from the gym', 'Members')
ON CONFLICT (key) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'GYM_OWNER'
  AND p.key = 'members.delete'
ON CONFLICT (role_id, permission_id) DO NOTHING;
