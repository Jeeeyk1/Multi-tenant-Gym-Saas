import { Injectable } from '@nestjs/common';
import { ForbiddenError } from '../../../../common/errors';
import { AnnouncementsRepository } from '../../infrastructure/persistence/announcements.repository';
import { CacheService } from '../../../../common/cache/cache.service';
import { ANNOUNCEMENTS_TTL_SECONDS, publishedAnnouncementsCacheKey } from '../announcements-cache';
import type { AuthenticatedUser } from '../../../../common/types/auth.types';

@Injectable()
export class ListAnnouncementsUseCase {
  constructor(
    private readonly repo: AnnouncementsRepository,
    private readonly cache: CacheService,
  ) {}

  async execute(gymId: string, caller: AuthenticatedUser, statusFilter?: string) {
    assertGymAccess(caller, gymId);

    const canManage =
      caller.type === 'org' || caller.permissions.includes('announcements.manage');

    // Members (no manage permission) may only see PUBLISHED — the hot, cacheable path.
    if (!canManage) {
      return this.cache.wrap(publishedAnnouncementsCacheKey(gymId), ANNOUNCEMENTS_TTL_SECONDS, () =>
        this.repo.listByGym(gymId, 'PUBLISHED'),
      );
    }

    // Managers get variable filters (low traffic) — not cached.
    return this.repo.listByGym(gymId, statusFilter);
  }
}

function assertGymAccess(caller: AuthenticatedUser, gymId: string) {
  if (caller.type === 'gym' && caller.gymId !== gymId) {
    throw new ForbiddenError('Access denied to this gym', 'GYM_ACCESS_DENIED');
  }
}
