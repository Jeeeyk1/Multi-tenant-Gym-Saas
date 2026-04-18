import { Injectable } from '@nestjs/common';
import { ForbiddenError, NotFoundError } from '../../../../common/errors';
import { StaffRepository } from '../../infrastructure/persistence/staff.repository';
import type { AuthenticatedUser } from '../../../../common/types/auth.types';

@Injectable()
export class RemoveRoleUseCase {
  constructor(private readonly repo: StaffRepository) {}

  async execute(gymId: string, staffId: string, roleId: string, caller: AuthenticatedUser) {
    assertGymAccess(caller, gymId);
    assertStaffManage(caller);

    const staff = await this.repo.findStaffById(staffId, gymId);
    if (!staff) {
      throw new NotFoundError('Staff member not found');
    }

    const assignment = await this.repo.findStaffRoleAssignment(staffId, roleId);
    if (!assignment) {
      throw new NotFoundError('Role assignment not found');
    }

    await this.repo.removeRole(staffId, roleId);
  }
}

function assertGymAccess(caller: AuthenticatedUser, gymId: string) {
  if (caller.type === 'gym' && caller.gymId !== gymId) {
    throw new ForbiddenError('Access denied to this gym', 'GYM_ACCESS_DENIED');
  }
}

function assertStaffManage(caller: AuthenticatedUser) {
  if (caller.type === 'gym' && !caller.permissions.includes('staff.manage')) {
    throw new ForbiddenError('Missing permission: staff.manage', 'PERMISSION_DENIED');
  }
}
