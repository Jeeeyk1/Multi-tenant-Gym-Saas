import { Injectable } from '@nestjs/common';
import { ForbiddenError, NotFoundError } from '../../../../common/errors';
import { MembersRepository } from '../../infrastructure/persistence/members.repository';
import type { AuthenticatedUser } from '../../../../common/types/auth.types';
import type { LogWeightDto } from '../../presentation/dto/log-weight.dto';
import { assertGymAccess, hasPermission } from '../../../../common/auth/authorization';
import { Permission } from '../../../../common/enums';

@Injectable()
export class LogWeightUseCase {
  constructor(private readonly repo: MembersRepository) {}

  async execute(gymId: string, memberId: string, dto: LogWeightDto, caller: AuthenticatedUser) {
    assertGymAccess(caller, gymId);

    const member = await this.repo.findMemberById(memberId, gymId);
    if (!member) throw new NotFoundError('Member not found', 'MEMBER_NOT_FOUND');

    // Member can log own weight; staff need members.edit
    const isSelf = caller.type === 'gym' && member.user.id === caller.sub;
    if (!isSelf && !hasPermission(caller, Permission.MEMBERS_EDIT)) {
      throw new ForbiddenError('Missing permission: members.edit', 'PERMISSION_DENIED');
    }

    return this.repo.logWeight(memberId, dto.weightKg, dto.notes);
  }
}
