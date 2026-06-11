import { Injectable } from '@nestjs/common';
import { ForbiddenError } from '../../../../common/errors';
import { RenewalsRepository } from '../../infrastructure/persistence/renewals.repository';
import type { AuthenticatedUser } from '../../../../common/types/auth.types';

@Injectable()
export class ListGymRenewalsUseCase {
  constructor(private readonly repo: RenewalsRepository) {}

  execute(gymId: string, caller: AuthenticatedUser, limit = 50) {
    if (caller.type === 'gym' && caller.gymId !== gymId) {
      throw new ForbiddenError('Access denied to this gym', 'GYM_ACCESS_DENIED');
    }
    if (caller.type === 'gym' && !caller.permissions.includes('members.view')) {
      throw new ForbiddenError('Missing permission: members.view', 'PERMISSION_DENIED');
    }
    return this.repo.listGymRenewals(gymId, limit);
  }
}
