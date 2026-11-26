import { Injectable, Logger } from '@nestjs/common';
import { NotFoundError } from '../../../../common/errors';
import { StaffRepository } from '../../infrastructure/persistence/staff.repository';
import { assertCanManageStaff } from '../../domain/staff-management.rules';
import type { AuthenticatedUser } from '../../../../common/types/auth.types';
import { assertGymAccess, assertPermission } from '../../../../common/auth/authorization';
import { Permission } from '../../../../common/enums';

@Injectable()
export class RemoveRoleUseCase {
  private readonly logger = new Logger(RemoveRoleUseCase.name);

  constructor(private readonly repo: StaffRepository) {}

  async execute(gymId: string, staffId: string, roleId: string, caller: AuthenticatedUser) {
    assertGymAccess(caller, gymId);
    assertPermission(caller, Permission.STAFF_MANAGE);

    const staff = await this.repo.findStaffById(staffId, gymId);
    if (!staff) {
      throw new NotFoundError('Staff member not found');
    }

    const roleName = staff.roles.find((r) => r.roleId === roleId)?.role.name;
    assertCanManageStaff(caller, staff, roleName);

    const assignment = await this.repo.findStaffRoleAssignment(staffId, roleId);
    if (!assignment) {
      throw new NotFoundError('Role assignment not found');
    }

    await this.repo.removeRole(staffId, roleId);
    this.logger.log(`staff role removed gym=${gymId} staff=${staffId} role=${roleName ?? roleId} by=${caller.sub}`);
  }
}
