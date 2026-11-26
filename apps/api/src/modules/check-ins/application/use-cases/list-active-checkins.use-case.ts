import { Injectable } from '@nestjs/common';
import { CheckInsRepository } from '../../infrastructure/persistence/check-ins.repository';
import type { AuthenticatedUser } from '../../../../common/types/auth.types';
import { assertGymAccess, assertPermission } from '../../../../common/auth/authorization';
import { Permission } from '../../../../common/enums';

@Injectable()
export class ListActiveCheckinsUseCase {
  constructor(private readonly repo: CheckInsRepository) {}

  async execute(gymId: string, caller: AuthenticatedUser) {
    assertGymAccess(caller, gymId);
    assertPermission(caller, Permission.CHECKINS_VIEW);

    const checkins = await this.repo.listActiveCheckins(gymId);

    // Staff see all active check-ins.
    // Members with checkins.view (staff) see all — privacy filtering applies to
    // member-facing views. For the staff dashboard, all are visible.
    return checkins;
  }
}
