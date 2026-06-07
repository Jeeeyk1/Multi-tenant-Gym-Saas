import { Injectable } from '@nestjs/common';
import { ConflictError, ForbiddenError, NotFoundError } from '../../../../common/errors';
import { AnnouncementsRepository } from '../../infrastructure/persistence/announcements.repository';
import type { AuthenticatedUser } from '../../../../common/types/auth.types';

const ARCHIVABLE_STATUSES = ['DRAFT', 'SCHEDULED', 'PUBLISHED'];

@Injectable()
export class ArchiveAnnouncementUseCase {
  constructor(private readonly repo: AnnouncementsRepository) {}

  async execute(gymId: string, announcementId: string, caller: AuthenticatedUser) {
    assertGymAccess(caller, gymId);
    assertPermission(caller, 'announcements.manage');

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

    return this.repo.update(announcementId, { status: 'ARCHIVED' });
  }
}

function assertGymAccess(caller: AuthenticatedUser, gymId: string) {
  if (caller.type === 'gym' && caller.gymId !== gymId) {
    throw new ForbiddenError('Access denied to this gym', 'GYM_ACCESS_DENIED');
  }
}

function assertPermission(caller: AuthenticatedUser, permission: string) {
  if (caller.type === 'gym' && !caller.permissions.includes(permission)) {
    throw new ForbiddenError(`Missing permission: ${permission}`, 'PERMISSION_DENIED');
  }
}
