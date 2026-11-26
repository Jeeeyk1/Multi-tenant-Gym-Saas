import { Injectable, Logger } from '@nestjs/common';
import { ConflictError, NotFoundError } from '../../../../common/errors';
import { StaffRepository } from '../../infrastructure/persistence/staff.repository';
import { assertCanManageStaff } from '../../domain/staff-management.rules';
import type { AuthenticatedUser } from '../../../../common/types/auth.types';
import { assertGymAccess, assertPermission } from '../../../../common/auth/authorization';
import { Permission } from '../../../../common/enums';

export interface AssignRoleInput {
  roleId: string;
}

@Injectable()
export class AssignRoleUseCase {
  private readonly logger = new Logger(AssignRoleUseCase.name);

  constructor(private readonly repo: StaffRepository) {}

  async execute(
    gymId: string,
    staffId: string,
    input: AssignRoleInput,
    caller: AuthenticatedUser,
  ) {
    assertGymAccess(caller, gymId);
    assertPermission(caller, Permission.STAFF_MANAGE);

    const staff = await this.repo.findStaffById(staffId, gymId);
    if (!staff) {
      throw new NotFoundError('Staff member not found');
    }

    const role = await this.repo.findRoleById(input.roleId);
    if (!role) {
      throw new NotFoundError('Role not found');
    }

    assertCanManageStaff(caller, staff, role.name);

    const existing = await this.repo.findStaffRoleAssignment(staffId, input.roleId);
    if (existing) {
      throw new ConflictError('Staff member already has this role', 'ROLE_ALREADY_ASSIGNED');
    }

    const assigned = await this.repo.assignRole(staffId, input.roleId, caller.sub);
    this.logger.log(`staff role assigned gym=${gymId} staff=${staffId} role=${role.name} by=${caller.sub}`);
    return assigned;
  }
}
