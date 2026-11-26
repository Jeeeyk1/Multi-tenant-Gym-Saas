import { StaffRole } from '@gym-saas/contracts';

export const ROLE_LABEL: Record<StaffRole, string> = {
  [StaffRole.OWNER]: 'Owner',
  [StaffRole.STAFF]: 'Staff',
  [StaffRole.TRAINER]: 'Trainer',
};

/** Shown when inviting someone, so the owner picks the right role without reading a permission list. */
export const ROLE_DESCRIPTION: Record<StaffRole, string> = {
  [StaffRole.STAFF]: 'Front desk: check-ins, members and renewals, announcements, community chat and the leaderboard.',
  [StaffRole.TRAINER]: 'Uses the mobile app: check-ins, community chat, PR reviews and badges. Sees members’ names only.',
  [StaffRole.OWNER]: 'Everything, including staff, billing, settings, reports and the AI assistant.',
};

export function roleLabel(name: string): string {
  return ROLE_LABEL[name as StaffRole] ?? name;
}

/**
 * The web dashboard is for owners and staff. Trainers (and members) use the mobile app; someone
 * who is both Staff and Trainer still gets the dashboard. This is about which app a person
 * uses, not access: the API checks permissions on every request.
 */
export function usesWebDashboard(roles: string[]): boolean {
  return roles.includes(StaffRole.OWNER) || roles.includes(StaffRole.STAFF);
}
