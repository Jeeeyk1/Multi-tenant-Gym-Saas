import { Injectable } from '@nestjs/common';
import { ForbiddenError, NotFoundError } from '../../../../common/errors';
import { BadgesRepository } from '../../infrastructure/persistence/badges.repository';
import type { AuthenticatedUser } from '../../../../common/types/auth.types';

@Injectable()
export class EquipBadgeUseCase {
  constructor(private readonly repo: BadgesRepository) {}

  async execute(
    gymId: string,
    badgeId: string,
    equipped: boolean,
    caller: AuthenticatedUser,
  ): Promise<void> {
    if (caller.type === 'gym' && caller.gymId !== gymId) {
      throw new ForbiddenError('Access denied to this gym', 'GYM_ACCESS_DENIED');
    }

    const member = await this.repo.findMemberByUserId(gymId, caller.sub);
    if (!member) {
      throw new NotFoundError('Member not found', 'MEMBER_NOT_FOUND');
    }

    const badge = await this.repo.findMemberBadge(badgeId, member.id, gymId);
    if (!badge) {
      throw new NotFoundError('Badge not found', 'BADGE_NOT_FOUND');
    }

    if (equipped && badge.expiresAt && badge.expiresAt < new Date()) {
      throw new ForbiddenError('Cannot equip an expired badge', 'BADGE_EXPIRED');
    }

    await this.repo.setBadgeEquipped(badgeId, member.id, gymId, equipped);
  }
}
