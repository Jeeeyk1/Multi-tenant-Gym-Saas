import { Injectable } from '@nestjs/common';
import { StaffRepository } from '../../infrastructure/persistence/staff.repository';
import type { AuthenticatedUser } from '../../../../common/types/auth.types';
import { assertAnyPermission, assertGymAccess } from '../../../../common/auth/authorization';
import { Permission } from '../../../../common/enums';

@Injectable()
export class ListStaffUseCase {
  constructor(private readonly repo: StaffRepository) {}

  async execute(gymId: string, caller: AuthenticatedUser) {
    assertGymAccess(caller, gymId);
    assertAnyPermission(caller, Permission.STAFF_VIEW, Permission.STAFF_MANAGE);

    return this.repo.listStaff(gymId);
  }

  listRoles() {
    return this.repo.listRoles();
  }
}
