import { hasPermission } from '../../../common/auth/authorization';
import { Permission } from '../../../common/enums';
import type { AuthenticatedUser } from '../../../common/types/auth.types';

interface MemberWithUser {
  id: string;
  status: string;
  user: { id: string; fullName: string };
}

/**
 * Without members.details (trainers), a member is just a name and a status: no contact
 * details, membership number, plan or dates.
 */
export function visibleMember<T extends MemberWithUser>(member: T, caller: AuthenticatedUser) {
  if (hasPermission(caller, Permission.MEMBERS_DETAILS)) return member;
  return { id: member.id, status: member.status, user: { id: member.user.id, fullName: member.user.fullName } };
}
