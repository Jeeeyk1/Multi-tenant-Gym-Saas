import { Injectable } from '@nestjs/common';
import { MembersRepository } from '../../infrastructure/persistence/members.repository';
import type { AuthenticatedUser } from '../../../../common/types/auth.types';
import { assertGymAccess, assertPermission } from '../../../../common/auth/authorization';
import { Permission } from '../../../../common/enums';
import { localDate } from '../../../../common/time/local-date';

const DEFAULT_DAYS = 7;
/** How many of the soonest expiries to list on the dashboard card. */
const SOONEST_LIMIT = 5;

function addDays(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * Active memberships ending in the next `days` days (gym's local calendar, today included),
 * the soonest few, and how many are already expired. Powers the staff dashboard's renewal card.
 */
@Injectable()
export class GetExpiringMembershipsUseCase {
  constructor(private readonly repo: MembersRepository) {}

  async execute(gymId: string, days: number | undefined, caller: AuthenticatedUser, now: Date = new Date()) {
    assertGymAccess(caller, gymId);
    assertPermission(caller, Permission.MEMBERS_RENEW);

    const window = days ?? DEFAULT_DAYS;
    const timeZone = await this.repo.getGymTimezone(gymId);
    const today = localDate(now, timeZone);
    const lastDay = addDays(today, window - 1);

    const [expiringSoon, expired, soonest] = await Promise.all([
      this.repo.countActiveExpiringBetween(gymId, today, lastDay),
      this.repo.countExpiredMembers(gymId),
      this.repo.listActiveExpiringBetween(gymId, today, lastDay, SOONEST_LIMIT),
    ]);

    return {
      days: window,
      from: today,
      to: lastDay,
      expiringSoon,
      expired,
      soonest: soonest.map((m) => ({
        id: m.id,
        fullName: m.user.fullName,
        membershipNumber: m.membershipNumber,
        expiryDate: m.expiryDate.toISOString().slice(0, 10),
      })),
    };
  }
}
