import { Injectable } from '@nestjs/common';
import { ForbiddenError, NotFoundError } from '../../../../common/errors';
import { RenewalsRepository } from '../../infrastructure/persistence/renewals.repository';
import type { AuthenticatedUser } from '../../../../common/types/auth.types';

@Injectable()
export class ListMyRenewalsUseCase {
  constructor(private readonly repo: RenewalsRepository) {}

  async execute(gymId: string, caller: AuthenticatedUser) {
    if (caller.type === 'gym' && caller.gymId !== gymId) {
      throw new ForbiddenError('Access denied to this gym', 'GYM_ACCESS_DENIED');
    }

    const member = await this.repo.findMemberByUserId(caller.sub, gymId);
    if (!member) {
      throw new NotFoundError('Member record not found', 'MEMBER_NOT_FOUND');
    }

    return this.repo.listRenewals(member.id);
  }
}
