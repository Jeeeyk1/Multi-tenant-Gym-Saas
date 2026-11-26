import { Injectable } from '@nestjs/common';
import { NotFoundError } from '../../../../common/errors';
import { MembersRepository } from '../../infrastructure/persistence/members.repository';
import type { AuthenticatedUser } from '../../../../common/types/auth.types';
import { assertGymAccess } from '../../../../common/auth/authorization';

export interface UpdateMyPrivacyInput {
  hideCheckinVisibility?: boolean;
  hideFromMemberList?: boolean;
}

@Injectable()
export class UpdateMyPrivacyUseCase {
  constructor(private readonly repo: MembersRepository) {}

  async execute(gymId: string, input: UpdateMyPrivacyInput, caller: AuthenticatedUser) {
    assertGymAccess(caller, gymId);

    const member = await this.repo.findFullMemberByUserId(gymId, caller.sub);
    if (!member) {
      throw new NotFoundError('Member not found', 'MEMBER_NOT_FOUND');
    }

    return this.repo.upsertMemberPrivacy(member.id, input);
  }
}
