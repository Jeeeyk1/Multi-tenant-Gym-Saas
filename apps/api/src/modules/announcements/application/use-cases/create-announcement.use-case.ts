import { Injectable } from '@nestjs/common';
import { ForbiddenError } from '../../../../common/errors';
import { AnnouncementsRepository } from '../../infrastructure/persistence/announcements.repository';
import type { AuthenticatedUser } from '../../../../common/types/auth.types';

export interface CreateAnnouncementInput {
  title: string;
  content: string;
  isPinned?: boolean;
  publishAt?: Date;
  expiresAt?: Date;
}

@Injectable()
export class CreateAnnouncementUseCase {
  constructor(private readonly repo: AnnouncementsRepository) {}

  async execute(gymId: string, input: CreateAnnouncementInput, caller: AuthenticatedUser) {
    assertGymAccess(caller, gymId);
    assertPermission(caller, 'announcements.manage');

    const status = resolveStatus(input.publishAt);

    return this.repo.create({
      gymId,
      createdBy: caller.sub,
      title: input.title,
      content: input.content,
      status,
      isPinned: input.isPinned ?? false,
      publishAt: input.publishAt,
      expiresAt: input.expiresAt,
    });
  }
}

/**
 * publish_at null or in the past → PUBLISHED immediately.
 * publish_at in the future → SCHEDULED.
 */
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
