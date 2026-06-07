import { Injectable } from '@nestjs/common';
import { ForbiddenError } from '../../../../common/errors';
import { AnnouncementsRepository } from '../../infrastructure/persistence/announcements.repository';
import type { AuthenticatedUser } from '../../../../common/types/auth.types';

@Injectable()
export class ListAnnouncementsUseCase {
  constructor(private readonly repo: AnnouncementsRepository) {}

  async execute(gymId: string, caller: AuthenticatedUser, statusFilter?: string) {
    assertGymAccess(caller, gymId);

    const canManage =
      caller.type === 'org' || caller.permissions.includes('announcements.manage');

    // Members (no manage permission) may only see PUBLISHED announcements
    const effectiveStatus = canManage ? statusFilter : 'PUBLISHED';

    return this.repo.listByGym(gymId, effectiveStatus);
  }
}

function assertGymAccess(caller: AuthenticatedUser, gymId: string) {
  if (caller.type === 'gym' && caller.gymId !== gymId) {
    throw new ForbiddenError('Access denied to this gym', 'GYM_ACCESS_DENIED');
  }
}
