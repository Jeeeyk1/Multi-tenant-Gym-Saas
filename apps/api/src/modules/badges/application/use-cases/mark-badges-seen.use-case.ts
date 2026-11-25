import { Injectable } from '@nestjs/common';
import { ForbiddenError, NotFoundError } from '../../../../common/errors';
import { BadgesRepository } from '../../infrastructure/persistence/badges.repository';
import type { AuthenticatedUser } from '../../../../common/types/auth.types';

/** The member has seen the "new badge" celebration for these badges. */
@Injectable()
export class MarkBadgesSeenUseCase {
  constructor(private readonly repo: BadgesRepository) {}

  async execute(gymId: string, badgeIds: string[], caller: AuthenticatedUser): Promise<void> {
    if (caller.type !== 'gym' || caller.gymId !== gymId) {
      throw new ForbiddenError('Access denied to this gym', 'GYM_ACCESS_DENIED');
    }
    const member = await this.repo.findMemberByUserId(gymId, caller.sub);
    if (!member) throw new NotFoundError('Member not found', 'MEMBER_NOT_FOUND');
    await this.repo.markBadgesSeen(member.id, gymId, badgeIds);
  }
}
