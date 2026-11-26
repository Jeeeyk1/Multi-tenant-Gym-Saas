import { Injectable } from '@nestjs/common';
import { ConflictError, NotFoundError } from '../../../../common/errors';
import { AnnouncementsRepository } from '../../infrastructure/persistence/announcements.repository';
import { CacheService } from '../../../../common/cache/cache.service';
import { publishedAnnouncementsCacheKey } from '../announcements-cache';
import type { AuthenticatedUser } from '../../../../common/types/auth.types';
import { assertGymAccess, assertPermission } from '../../../../common/auth/authorization';
import { Permission } from '../../../../common/enums';

const ARCHIVABLE_STATUSES = ['DRAFT', 'SCHEDULED', 'PUBLISHED'];

@Injectable()
export class ArchiveAnnouncementUseCase {
  constructor(
    private readonly repo: AnnouncementsRepository,
    private readonly cache: CacheService,
  ) {}

  async execute(gymId: string, announcementId: string, caller: AuthenticatedUser) {
    assertGymAccess(caller, gymId);
    assertPermission(caller, Permission.ANNOUNCEMENTS_MANAGE);

    const announcement = await this.repo.findById(announcementId, gymId);
    if (!announcement) {
      throw new NotFoundError('Announcement not found', 'ANNOUNCEMENT_NOT_FOUND');
    }

    if (!ARCHIVABLE_STATUSES.includes(announcement.status)) {
      throw new ConflictError(
        `Cannot archive an announcement with status ${announcement.status}`,
        'ANNOUNCEMENT_NOT_ARCHIVABLE',
      );
    }

    const archived = await this.repo.update(announcementId, { status: 'ARCHIVED' });
    await this.cache.del(publishedAnnouncementsCacheKey(gymId));
    return archived;
  }
}
