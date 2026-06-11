import { Injectable } from '@nestjs/common';
import { ForbiddenError, NotFoundError } from '../../../../common/errors';
import { MembersRepository } from '../../infrastructure/persistence/members.repository';
import type { AuthenticatedUser } from '../../../../common/types/auth.types';
import type { LogWeightDto } from '../../presentation/dto/log-weight.dto';

@Injectable()
export class LogWeightUseCase {
  constructor(private readonly repo: MembersRepository) {}

  async execute(gymId: string, memberId: string, dto: LogWeightDto, caller: AuthenticatedUser) {
    if (caller.type === 'gym' && caller.gymId !== gymId) {
      throw new ForbiddenError('Access denied to this gym', 'GYM_ACCESS_DENIED');
    }

    const member = await this.repo.findMemberById(memberId, gymId);
    if (!member) throw new NotFoundError('Member not found', 'MEMBER_NOT_FOUND');

    // Member can log own weight; staff need members.edit
    const isSelf = caller.type === 'gym' && member.id === memberId;
    if (!isSelf && caller.type === 'gym' && !caller.permissions.includes('members.edit')) {
      throw new ForbiddenError('Missing permission: members.edit', 'PERMISSION_DENIED');
    }

    return this.repo.logWeight(memberId, dto.weightKg, dto.notes);
  }
}
