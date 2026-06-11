import { Injectable } from '@nestjs/common';
import { ForbiddenError, NotFoundError } from '../../../../common/errors';
import { LeaderboardRepository } from '../../infrastructure/persistence/leaderboard.repository';
import type { AuthenticatedUser } from '../../../../common/types/auth.types';

@Injectable()
export class GetMyPrsUseCase {
  constructor(private readonly repo: LeaderboardRepository) {}

  async execute(gymId: string, caller: AuthenticatedUser) {
    assertGymAccess(caller, gymId);
    const member = await this.repo.findMemberByUserId(caller.sub, gymId);
    if (!member) throw new NotFoundError('Member not found', 'MEMBER_NOT_FOUND');
    return this.repo.getMyPrs(member.id, gymId);
  }
}

function assertGymAccess(caller: AuthenticatedUser, gymId: string) {
  if (caller.type === 'gym' && caller.gymId !== gymId) {
    throw new ForbiddenError('Access denied to this gym', 'GYM_ACCESS_DENIED');
  }
}
