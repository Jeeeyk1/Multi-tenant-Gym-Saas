import { Injectable } from '@nestjs/common';
import { ForbiddenError, NotFoundError } from '../../../../common/errors';
import { MembersRepository } from '../../infrastructure/persistence/members.repository';
import type { AuthenticatedUser } from '../../../../common/types/auth.types';

export interface UpdateMyPrivacyInput {
  hideCheckinVisibility?: boolean;
  hideFromMemberList?: boolean;
}

@Injectable()
export class UpdateMyPrivacyUseCase {
  constructor(private readonly repo: MembersRepository) {}

  async execute(gymId: string, input: UpdateMyPrivacyInput, caller: AuthenticatedUser) {
    if (caller.type === 'gym' && caller.gymId !== gymId) {
      throw new ForbiddenError('Access denied to this gym', 'GYM_ACCESS_DENIED');
    }

    const member = await this.repo.findFullMemberByUserId(gymId, caller.sub);
    if (!member) {
      throw new NotFoundError('Member not found', 'MEMBER_NOT_FOUND');
    }

    return this.repo.upsertMemberPrivacy(member.id, input);
  }
}
