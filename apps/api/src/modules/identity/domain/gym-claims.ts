import { MEMBER_ROLE, Permission } from '../../../common/enums';

// Every member can check in and read announcements; not stored per gym.
export const MEMBER_PERMISSIONS: readonly string[] = [Permission.CHECKINS_SELF, Permission.ANNOUNCEMENTS_VIEW];

export interface StaffWithRoles {
  roles: { role: { name: string; rolePermissions: { permission: { key: string } }[] } }[];
}

/**
 * The roles and permissions in a gym token. Staff get the union of their roles' permissions;
 * someone who is also a member of the gym (e.g. a trainer who trains there) also gets the
 * MEMBER role and member permissions, so the app can offer them a member view.
 * Returns null when the user is neither staff nor a member here.
 */
export function gymClaims(staff: StaffWithRoles | null, isMember: boolean): { roles: string[]; permissions: string[] } | null {
  if (!staff && !isMember) return null;
  const roles = staff ? staff.roles.map((sr) => sr.role.name) : [];
  const permissions = new Set(staff ? staff.roles.flatMap((sr) => sr.role.rolePermissions.map((rp) => rp.permission.key)) : []);
  if (isMember) {
    roles.push(MEMBER_ROLE);
    MEMBER_PERMISSIONS.forEach((p) => permissions.add(p));
  }
  return { roles, permissions: [...permissions] };
}
