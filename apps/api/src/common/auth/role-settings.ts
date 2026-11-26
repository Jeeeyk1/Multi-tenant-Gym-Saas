import { Permission, StaffRole } from '../enums';

// Lives in common/auth because both identity (building tokens) and staff (the settings API) need it;
// importing one module from the other would be worse.

/**
 * Permissions an owner may switch on or off for a role in their gym. Gyms are set up
 * differently, so instead of one fixed org chart the owner adjusts these. Each setting's
 * default is whatever the role has in `role_permissions`; a gym override replaces it.
 * Add a setting here (and nowhere else) to make another permission adjustable.
 */
export enum RoleSettingKey {
  STAFF_MANAGES_LEADERBOARD = 'STAFF_MANAGES_LEADERBOARD',
}

export interface RoleSetting {
  key: RoleSettingKey;
  role: StaffRole.STAFF | StaffRole.TRAINER;
  permission: Permission;
  label: string;
  description: string;
}

export const ROLE_SETTINGS: readonly RoleSetting[] = [
  {
    key: RoleSettingKey.STAFF_MANAGES_LEADERBOARD,
    role: StaffRole.STAFF,
    permission: Permission.LEADERBOARD_MANAGE,
    label: 'Staff can manage the leaderboard',
    description: 'Choose the leaderboard lifts and set the bronze, silver and gold lift ladders.',
  },
];

export function findRoleSetting(key: string): RoleSetting | undefined {
  return ROLE_SETTINGS.find((s) => s.key === key);
}

/** A gym's change to one role's permission. */
export interface RoleOverride {
  roleName: string;
  permissionKey: string;
  isGranted: boolean;
}

/**
 * A role's permissions in one gym: its defaults, with that gym's overrides applied.
 * Only adjustable (role, permission) pairs are honoured, and the owner role never changes.
 */
export function applyRoleOverrides(roleName: string, defaults: string[], overrides: RoleOverride[]): string[] {
  if (roleName === StaffRole.OWNER) return defaults;
  const permissions = new Set(defaults);
  for (const o of overrides) {
    if (o.roleName !== roleName) continue;
    if (!ROLE_SETTINGS.some((s) => s.role === o.roleName && s.permission === o.permissionKey)) continue;
    if (o.isGranted) permissions.add(o.permissionKey);
    else permissions.delete(o.permissionKey);
  }
  return [...permissions];
}
