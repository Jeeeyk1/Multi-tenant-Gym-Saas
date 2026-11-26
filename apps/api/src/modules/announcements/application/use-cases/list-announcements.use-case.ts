import { Injectable } from '@nestjs/common';
import { AnnouncementsRepository } from '../../infrastructure/persistence/announcements.repository';
import { CacheService } from '../../../../common/cache/cache.service';
import { ANNOUNCEMENTS_TTL_SECONDS, publishedAnnouncementsCacheKey } from '../announcements-cache';
import type { AuthenticatedUser } from '../../../../common/types/auth.types';
import { assertGymAccess, hasPermission } from '../../../../common/auth/authorization';
import { Permission } from '../../../../common/enums';

@Injectable()
export class ListAnnouncementsUseCase {
  constructor(
    private readonly repo: AnnouncementsRepository,
    private readonly cache: CacheService,
  ) {}

  async execute(gymId: string, caller: AuthenticatedUser, statusFilter?: string) {
    assertGymAccess(caller, gymId);

    const canManage =
      hasPermission(caller, Permission.ANNOUNCEMENTS_MANAGE);

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
