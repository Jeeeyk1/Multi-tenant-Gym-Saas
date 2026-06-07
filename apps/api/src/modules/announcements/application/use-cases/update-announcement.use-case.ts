import { Injectable } from '@nestjs/common';
import { ForbiddenError, NotFoundError } from '../../../../common/errors';
import { AnnouncementsRepository } from '../../infrastructure/persistence/announcements.repository';
import type { AuthenticatedUser } from '../../../../common/types/auth.types';

export interface UpdateAnnouncementInput {
  title?: string;
  content?: string;
  isPinned?: boolean;
  publishAt?: Date | null;
  expiresAt?: Date | null;
}

const IMMUTABLE_STATUSES = ['EXPIRED', 'ARCHIVED'];

@Injectable()
export class UpdateAnnouncementUseCase {
  constructor(private readonly repo: AnnouncementsRepository) {}

  async execute(
    gymId: string,
    announcementId: string,
    input: UpdateAnnouncementInput,
    caller: AuthenticatedUser,
  ) {
    assertGymAccess(caller, gymId);
    assertPermission(caller, 'announcements.manage');

    const announcement = await this.repo.findById(announcementId, gymId);
    if (!announcement) {
      throw new NotFoundError('Announcement not found', 'ANNOUNCEMENT_NOT_FOUND');
    }

    if (IMMUTABLE_STATUSES.includes(announcement.status)) {
      throw new ForbiddenError(
        `Cannot update an announcement with status ${announcement.status}`,
        'ANNOUNCEMENT_NOT_EDITABLE',
      );
    }

    // Re-evaluate status only when publishAt is explicitly provided in the update
    const status =
      'publishAt' in input ? resolveStatus(input.publishAt ?? undefined) : undefined;

    return this.repo.update(announcementId, {
      title: input.title,
      content: input.content,
      isPinned: input.isPinned,
      publishAt: input.publishAt,
      expiresAt: input.expiresAt,
      ...(status ? { status } : {}),
    });
  }
}

function resolveStatus(publishAt?: Date): string {
  if (!publishAt || publishAt <= new Date()) return 'PUBLISHED';
  return 'SCHEDULED';
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
