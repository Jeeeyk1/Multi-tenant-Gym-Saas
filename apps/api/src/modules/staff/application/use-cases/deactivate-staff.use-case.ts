import { Injectable } from '@nestjs/common';
import { NotFoundError } from '../../../../common/errors';
import { StaffRepository } from '../../infrastructure/persistence/staff.repository';
import { assertCanManageStaff } from '../../domain/staff-management.rules';
import type { AuthenticatedUser } from '../../../../common/types/auth.types';
import { assertGymAccess, assertPermission } from '../../../../common/auth/authorization';
import { Permission } from '../../../../common/enums';

@Injectable()
export class DeactivateStaffUseCase {
  constructor(private readonly repo: StaffRepository) {}

  async execute(gymId: string, staffId: string, caller: AuthenticatedUser) {
    assertGymAccess(caller, gymId);
    assertPermission(caller, Permission.STAFF_MANAGE);

    const staff = await this.repo.findStaffById(staffId, gymId);
    if (!staff) {
      throw new NotFoundError('Staff member not found');
    }

    assertCanManageStaff(caller, staff);

    return this.repo.deactivate(staffId);
  }
}
