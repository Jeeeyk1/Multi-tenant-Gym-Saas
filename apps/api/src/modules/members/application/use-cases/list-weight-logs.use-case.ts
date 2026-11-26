import { Injectable } from '@nestjs/common';
import { ForbiddenError, NotFoundError } from '../../../../common/errors';
import { MembersRepository } from '../../infrastructure/persistence/members.repository';
import type { AuthenticatedUser } from '../../../../common/types/auth.types';
import { assertGymAccess, hasPermission } from '../../../../common/auth/authorization';
import { Permission } from '../../../../common/enums';

@Injectable()
export class ListWeightLogsUseCase {
  constructor(private readonly repo: MembersRepository) {}

  async execute(gymId: string, memberId: string, caller: AuthenticatedUser, limit = 50) {
    assertGymAccess(caller, gymId);
    const member = await this.repo.findMemberById(memberId, gymId);
    if (!member) throw new NotFoundError('Member not found', 'MEMBER_NOT_FOUND');

    // Members read their own history; staff need members.view.
    const isSelf = caller.type === 'gym' && member.user.id === caller.sub;
    if (!isSelf && !hasPermission(caller, Permission.MEMBERS_VIEW)) {
      throw new ForbiddenError('Missing permission: members.view', 'PERMISSION_DENIED');
    }

    return this.repo.listWeightLogs(memberId, limit);
  }
}
