import { Injectable } from '@nestjs/common';
import { ForbiddenError } from '../../../../common/errors';
import { CheckInsRepository } from '../../infrastructure/persistence/check-ins.repository';
import type { AuthenticatedUser } from '../../../../common/types/auth.types';

@Injectable()
export class ListActiveCheckinsUseCase {
  constructor(private readonly repo: CheckInsRepository) {}

  async execute(gymId: string, caller: AuthenticatedUser) {
    assertGymAccess(caller, gymId);
    assertPermission(caller, 'checkins.view');

    const checkins = await this.repo.listActiveCheckins(gymId);

    // Staff see all active check-ins.
    // Members with checkins.view (staff) see all — privacy filtering applies to
    // member-facing views. For the staff dashboard, all are visible.
    return checkins;
  }
}

function assertGymAccess(caller: AuthenticatedUser, gymId: string) {
  if (caller.type === 'gym' && caller.gymId !== gymId) {
    throw new ForbiddenError('Access denied to this gym', 'GYM_ACCESS_DENIED');
  }
}

function assertPermission(caller: AuthenticatedUser, permission: string) {
  if (caller.type === 'gym' && !caller.permissions.includes(permission)) {
    throw new ForbiddenError(`Missing permission: ${permission}`, 'PERMISSION_DENIED');
  }
}
