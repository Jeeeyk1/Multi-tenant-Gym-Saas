import { Injectable } from '@nestjs/common';
import { NotFoundError } from '../../../../common/errors';
import { RenewalsRepository } from '../../infrastructure/persistence/renewals.repository';
import type { AuthenticatedUser } from '../../../../common/types/auth.types';
import { assertGymAccess, assertPermission } from '../../../../common/auth/authorization';
import { Permission } from '../../../../common/enums';

@Injectable()
export class ListRenewalsUseCase {
  constructor(private readonly repo: RenewalsRepository) {}

  async execute(gymId: string, memberId: string, caller: AuthenticatedUser) {
    assertGymAccess(caller, gymId);
    assertPermission(caller, Permission.MEMBERS_VIEW);

    const member = await this.repo.findMemberForRenewal(memberId, gymId);
    if (!member) {
      throw new NotFoundError('Member not found', 'MEMBER_NOT_FOUND');
    }

    return this.repo.listRenewals(memberId);
  }
}
