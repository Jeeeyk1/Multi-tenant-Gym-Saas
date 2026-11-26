import { hasPermission } from './authorization';
import { Permission } from '../enums';
import type { AuthenticatedUser } from '../types/auth.types';

/**
 * Lists that show members by name (check-ins, pending PRs) also carry the membership number,
 * which is a member detail. Callers without members.details (trainers) get it removed.
 */
export function withoutMemberDetails<T extends { member: { membershipNumber?: string } }>(
  rows: T[],
  caller: AuthenticatedUser,
): T[] {
  if (hasPermission(caller, Permission.MEMBERS_DETAILS)) return rows;
  return rows.map((row) => {
    const member = { ...row.member };
    delete member.membershipNumber;
    return { ...row, member };
  });
}
