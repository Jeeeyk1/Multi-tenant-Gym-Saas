import { ForbiddenError } from '../errors';
import type { Permission } from '../enums';
import type { AuthenticatedUser } from '../types/auth.types';

// Authorization checks shared by every use case. Org tokens (gym owners signed in through
// the organization) are scoped by GymAccessGuard and hold every permission in their gyms.

/** A gym token may only act on its own gym. */
export function assertGymAccess(caller: AuthenticatedUser, gymId: string): void {
  if (caller.type === 'gym' && caller.gymId !== gymId) {
    throw new ForbiddenError('Access denied to this gym', 'GYM_ACCESS_DENIED');
  }
}

export function hasPermission(caller: AuthenticatedUser, permission: Permission): boolean {
  return caller.type !== 'gym' || caller.permissions.includes(permission);
}

export function assertPermission(caller: AuthenticatedUser, permission: Permission): void {
  if (!hasPermission(caller, permission)) {
    throw new ForbiddenError(`Missing permission: ${permission}`, 'PERMISSION_DENIED');
  }
}

/** Passes when the caller holds at least one of `permissions`; the error names the first. */
export function assertAnyPermission(caller: AuthenticatedUser, ...permissions: Permission[]): void {
  if (!permissions.some((p) => hasPermission(caller, p))) {
    throw new ForbiddenError(`Missing permission: ${permissions[0]}`, 'PERMISSION_DENIED');
  }
}
