/**
 * JWT payload shapes for the two login tiers.
 *
 * OrgAuthUser  — issued by POST /auth/org/login
 *                Contains organizationId and orgRole. No gym context.
 *
 * GymAuthUser  — issued by POST /auth/gym/login
 *                Contains gymId, roles, and flattened permissions.
 *                This is the token used for all gym-scoped operations.
 */

export interface OrgAuthUser {
  /** maps to users.id */
  sub: string;
  type: 'org';
  organizationId: string;
  orgRole: 'OWNER' | 'CO_OWNER' | 'ORG_ADMIN';
}

export interface GymAuthUser {
  /** maps to users.id */
  sub: string;
  type: 'gym';
  gymId: string;
  /** Role names — for informational purposes only. Always check permissions. */
  roles: string[];
  /**
   * Flattened union of all assigned roles' permissions.
   * Built at login time. Use @RequirePermission() to enforce.
   * e.g. ['members.view', 'checkins.manage', 'staff.manage']
   */
  permissions: string[];
}

export type AuthenticatedUser = OrgAuthUser | GymAuthUser;
