import { Injectable } from '@nestjs/common';
import { NotFoundError } from '../../../../common/errors';
import { MembersRepository } from '../../infrastructure/persistence/members.repository';
import type { AuthenticatedUser } from '../../../../common/types/auth.types';
import { assertGymAccess } from '../../../../common/auth/authorization';

@Injectable()
export class GetMyProfileUseCase {
  constructor(private readonly repo: MembersRepository) {}

  async execute(gymId: string, caller: AuthenticatedUser) {
    assertGymAccess(caller, gymId);

    const member = await this.repo.findMemberByUserId(gymId, caller.sub);
    if (!member) {
      throw new NotFoundError('Member record not found', 'MEMBER_NOT_FOUND');
    }

    const profile = await this.repo.findMyProfile(member.id);
    return profile ?? { memberId: member.id, onboardingDone: false };
  }
}
