import { Injectable } from '@nestjs/common';
import { RenewalsRepository } from '../../infrastructure/persistence/renewals.repository';
import type { AuthenticatedUser } from '../../../../common/types/auth.types';
import { assertGymAccess, assertPermission } from '../../../../common/auth/authorization';
import { Permission } from '../../../../common/enums';

@Injectable()
export class ListGymRenewalsUseCase {
  constructor(private readonly repo: RenewalsRepository) {}

  execute(gymId: string, caller: AuthenticatedUser, limit = 50) {
    assertGymAccess(caller, gymId);
    assertPermission(caller, Permission.MEMBERS_DETAILS);
    return this.repo.listGymRenewals(gymId, limit);
  }
}
