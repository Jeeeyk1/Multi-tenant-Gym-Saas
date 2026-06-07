import { Injectable } from '@nestjs/common';
import { ForbiddenError, NotFoundError } from '../../../../common/errors';
import { MembersRepository } from '../../infrastructure/persistence/members.repository';
import type { AuthenticatedUser } from '../../../../common/types/auth.types';

@Injectable()
export class GetMyProfileUseCase {
  constructor(private readonly repo: MembersRepository) {}

  async execute(gymId: string, caller: AuthenticatedUser) {
    if (caller.type === 'gym' && caller.gymId !== gymId) {
      throw new ForbiddenError('Access denied to this gym', 'GYM_ACCESS_DENIED');
    }

    const member = await this.repo.findMemberByUserId(gymId, caller.sub);
    if (!member) {
      throw new NotFoundError('Member record not found', 'MEMBER_NOT_FOUND');
    }

    const profile = await this.repo.findMyProfile(member.id);
    return profile ?? { memberId: member.id, onboardingDone: false };
  }
}
