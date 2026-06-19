import { Injectable } from '@nestjs/common';
import { ForbiddenError, NotFoundError } from '../../../../common/errors';
import { BadgesRepository } from '../../infrastructure/persistence/badges.repository';
import type { AuthenticatedUser } from '../../../../common/types/auth.types';

@Injectable()
export class ListMemberBadgesUseCase {
  constructor(private readonly repo: BadgesRepository) {}

  async execute(gymId: string, targetMemberId: string, caller: AuthenticatedUser) {
    assertGymAccess(caller, gymId);

    // Members can only see their own badges
    if (caller.type === 'gym') {
      const myMember = await this.repo.findMemberByUserId(gymId, caller.sub);
      if (!myMember) throw new NotFoundError('Member not found', 'MEMBER_NOT_FOUND');

      const canViewOthers = caller.permissions.includes('members.view');
      if (!canViewOthers && myMember.id !== targetMemberId) {
        throw new ForbiddenError('Cannot view another member\'s badges', 'FORBIDDEN');
      }
    }

    const member = await this.repo.findMemberInGym(gymId, targetMemberId);
    if (!member) throw new NotFoundError('Member not found in this gym', 'MEMBER_NOT_FOUND');

    return this.repo.listMemberBadges(targetMemberId, gymId);
  }

  async executeForSelf(gymId: string, caller: AuthenticatedUser) {
    assertGymAccess(caller, gymId);
    if (caller.type !== 'gym') throw new ForbiddenError('Only gym members can access this', 'FORBIDDEN');

    const member = await this.repo.findMemberByUserId(gymId, caller.sub);
    if (!member) throw new NotFoundError('Member not found', 'MEMBER_NOT_FOUND');

    return this.repo.listMemberBadges(member.id, gymId);
  }
}

function assertGymAccess(caller: AuthenticatedUser, gymId: string) {
  if (caller.type === 'gym' && caller.gymId !== gymId) {
    throw new ForbiddenError('Access denied to this gym', 'GYM_ACCESS_DENIED');
  }
}
