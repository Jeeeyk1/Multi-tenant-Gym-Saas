import { ForbiddenError } from '../../../common/errors';
import { StaffRole } from '../../../common/enums';
import type { AuthenticatedUser } from '../../../common/types/auth.types';

interface TargetStaff {
  userId: string;
  roles: { role: { name: string } }[];
}

/**
 * Limits what a gym-level caller with `staff.manage` may do to a staff record,
 * so the permission cannot be used to take over the gym:
 *
 * - nobody changes their own roles or deactivates themself;
 * - only a gym owner may grant or remove the owner role, or act on an owner.
 *
 * Org-level callers are not restricted — they own the gym.
 */
export function assertCanManageStaff(
  caller: AuthenticatedUser,
  target: TargetStaff,
  roleName?: string,
): void {
  if (caller.type !== 'gym') return;

  if (target.userId === caller.sub) {
    throw new ForbiddenError('You cannot change your own staff access', 'CANNOT_MANAGE_SELF');
  }

  const callerIsOwner = caller.roles.includes(StaffRole.GYM_OWNER);
  if (callerIsOwner) return;

  const targetIsOwner = target.roles.some((r) => r.role.name === StaffRole.GYM_OWNER);
  if (targetIsOwner || roleName === StaffRole.GYM_OWNER) {
    throw new ForbiddenError('Only a gym owner can manage the owner role', 'OWNER_ROLE_PROTECTED');
  }
}
