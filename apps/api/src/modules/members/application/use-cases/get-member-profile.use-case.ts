import { Injectable } from '@nestjs/common';
import { ForbiddenError, NotFoundError } from '../../../../common/errors';
import { MembersRepository } from '../../infrastructure/persistence/members.repository';
import type { AuthenticatedUser } from '../../../../common/types/auth.types';

@Injectable()
export class GetMemberProfileUseCase {
  constructor(private readonly repo: MembersRepository) {}

  async execute(gymId: string, memberId: string, caller: AuthenticatedUser) {
    if (caller.type === 'gym' && caller.gymId !== gymId) {
      throw new ForbiddenError('Access denied to this gym', 'GYM_ACCESS_DENIED');
    }
    if (caller.type === 'gym' && !caller.permissions.includes('members.view')) {
      throw new ForbiddenError('Missing permission: members.view', 'PERMISSION_DENIED');
    }

    const member = await this.repo.findMemberById(memberId, gymId);
    if (!member) throw new NotFoundError('Member not found', 'MEMBER_NOT_FOUND');

    const profile = await this.repo.findProfileByMemberId(memberId);
    return profile ?? { memberId, onboardingDone: false };
  }
}
