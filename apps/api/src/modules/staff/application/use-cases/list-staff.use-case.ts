import { Injectable } from '@nestjs/common';
import { ForbiddenError } from '../../../../common/errors';
import { StaffRepository } from '../../infrastructure/persistence/staff.repository';
import type { AuthenticatedUser } from '../../../../common/types/auth.types';

@Injectable()
export class ListStaffUseCase {
  constructor(private readonly repo: StaffRepository) {}

  async execute(gymId: string, caller: AuthenticatedUser) {
    assertGymAccess(caller, gymId);
    assertStaffView(caller);

    return this.repo.listStaff(gymId);
  }
}

function assertGymAccess(caller: AuthenticatedUser, gymId: string) {
  if (caller.type === 'gym' && caller.gymId !== gymId) {
    throw new ForbiddenError('Access denied to this gym', 'GYM_ACCESS_DENIED');
  }
}

function assertStaffView(caller: AuthenticatedUser) {
  if (
    caller.type === 'gym' &&
    !caller.permissions.includes('staff.view') &&
    !caller.permissions.includes('staff.manage')
  ) {
    throw new ForbiddenError('Missing permission: staff.view', 'PERMISSION_DENIED');
  }
}
