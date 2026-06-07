import { Injectable } from '@nestjs/common';
import { ForbiddenError, NotFoundError } from '../../../../common/errors';
import { AnnouncementsRepository } from '../../infrastructure/persistence/announcements.repository';
import type { AuthenticatedUser } from '../../../../common/types/auth.types';

@Injectable()
export class MarkAnnouncementReadUseCase {
  constructor(private readonly repo: AnnouncementsRepository) {}

  async execute(gymId: string, announcementId: string, caller: AuthenticatedUser) {
    assertGymAccess(caller, gymId);

    const announcement = await this.repo.findById(announcementId, gymId);
    if (!announcement || announcement.status !== 'PUBLISHED') {
      throw new NotFoundError('Announcement not found', 'ANNOUNCEMENT_NOT_FOUND');
    }

    await this.repo.markRead(announcementId, caller.sub);

    return { ok: true };
  }
}

function assertGymAccess(caller: AuthenticatedUser, gymId: string) {
  if (caller.type === 'gym' && caller.gymId !== gymId) {
    throw new ForbiddenError('Access denied to this gym', 'GYM_ACCESS_DENIED');
  }
}
