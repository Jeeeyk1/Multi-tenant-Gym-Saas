import { Injectable } from '@nestjs/common';
import { ConflictError, NotFoundError } from '../../../../common/errors';
import { MembersRepository } from '../../infrastructure/persistence/members.repository';
import type { AuthenticatedUser } from '../../../../common/types/auth.types';
import { assertGymAccess, assertPermission } from '../../../../common/auth/authorization';
import { MemberStatus, Permission } from '../../../../common/enums';

@Injectable()
export class ReactivateMemberUseCase {
  constructor(private readonly repo: MembersRepository) {}

  async execute(gymId: string, memberId: string, caller: AuthenticatedUser) {
    assertGymAccess(caller, gymId);
    assertPermission(caller, Permission.MEMBERS_EDIT);

    const member = await this.repo.findMemberById(memberId, gymId);
    if (!member) {
      throw new NotFoundError('Member not found', 'MEMBER_NOT_FOUND');
    }

    if (member.status === MemberStatus.DELETED) {
      throw new ConflictError('This member deleted their account', 'MEMBER_DELETED');
    }

    if (member.status === 'ACTIVE') {
      throw new ConflictError('Member is already active', 'ALREADY_ACTIVE');
    }

    return this.repo.updateStatus(memberId, 'ACTIVE');
  }
}
