import { Injectable } from '@nestjs/common';
import { NotFoundError } from '../../../../common/errors';
import { CheckInsRepository } from '../../infrastructure/persistence/check-ins.repository';
import type { AuthenticatedUser } from '../../../../common/types/auth.types';
import { assertGymAccess, assertPermission } from '../../../../common/auth/authorization';
import { Permission } from '../../../../common/enums';
import { computeCheckinStreak } from '../../../badges/domain/badge-stats';

/**
 * The caller's check-in streak in the gym's local days. Same rule as the streak badges,
 * so the number on Home and the badge progress always agree.
 */
@Injectable()
export class GetMyCheckinStreakUseCase {
  constructor(private readonly repo: CheckInsRepository) {}

  async execute(gymId: string, caller: AuthenticatedUser, now: Date = new Date()) {
    assertGymAccess(caller, gymId);
    assertPermission(caller, Permission.CHECKINS_SELF);

    const member = await this.repo.findMemberByUserId(caller.sub, gymId);
    if (!member) {
      throw new NotFoundError('Member not found in this gym', 'MEMBER_NOT_FOUND');
    }

    const [timeZone, checkins] = await Promise.all([
      this.repo.getGymTimezone(gymId),
      this.repo.listCheckinTimestamps(member.id),
    ]);
    return { streak: computeCheckinStreak(checkins, timeZone, now) };
  }
}
