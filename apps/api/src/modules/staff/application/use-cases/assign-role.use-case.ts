import { Injectable } from '@nestjs/common';
import { ConflictError, ForbiddenError, NotFoundError } from '../../../../common/errors';
import { StaffRepository } from '../../infrastructure/persistence/staff.repository';
import type { AuthenticatedUser } from '../../../../common/types/auth.types';

export interface AssignRoleInput {
  roleId: string;
}

@Injectable()
export class AssignRoleUseCase {
  constructor(private readonly repo: StaffRepository) {}

  async execute(
    gymId: string,
    staffId: string,
    input: AssignRoleInput,
    caller: AuthenticatedUser,
  ) {
    assertGymAccess(caller, gymId);
    assertStaffManage(caller);

    const staff = await this.repo.findStaffById(staffId, gymId);
    if (!staff) {
      throw new NotFoundError('Staff member not found');
    }

    const role = await this.repo.findRoleById(input.roleId);
    if (!role) {
      throw new NotFoundError('Role not found');
    }

    const existing = await this.repo.findStaffRoleAssignment(staffId, input.roleId);
    if (existing) {
      throw new ConflictError('Staff member already has this role', 'ROLE_ALREADY_ASSIGNED');
    }

    return this.repo.assignRole(staffId, input.roleId, caller.sub);
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
