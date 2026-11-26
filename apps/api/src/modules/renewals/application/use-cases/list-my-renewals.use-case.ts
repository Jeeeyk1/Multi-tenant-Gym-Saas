import { Injectable } from '@nestjs/common';
import { NotFoundError } from '../../../../common/errors';
import { RenewalsRepository } from '../../infrastructure/persistence/renewals.repository';
import type { AuthenticatedUser } from '../../../../common/types/auth.types';
import { assertGymAccess } from '../../../../common/auth/authorization';

@Injectable()
export class ListMyRenewalsUseCase {
  constructor(private readonly repo: RenewalsRepository) {}

  async execute(gymId: string, caller: AuthenticatedUser) {
    assertGymAccess(caller, gymId);

    const member = await this.repo.findMemberByUserId(caller.sub, gymId);
    if (!member) {
      throw new NotFoundError('Member record not found', 'MEMBER_NOT_FOUND');
    }

    return this.repo.listRenewals(member.id);
  }
}
