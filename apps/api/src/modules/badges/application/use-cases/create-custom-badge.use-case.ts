import { Injectable } from '@nestjs/common';
import { ForbiddenError } from '../../../../common/errors';
import { BadgesRepository } from '../../infrastructure/persistence/badges.repository';
import type { AuthenticatedUser } from '../../../../common/types/auth.types';

export interface CreateCustomBadgeInput {
  name: string;
  description?: string;
  icon: string;
  color: string;
}

@Injectable()
export class CreateCustomBadgeUseCase {
  constructor(private readonly repo: BadgesRepository) {}

  async execute(gymId: string, input: CreateCustomBadgeInput, caller: AuthenticatedUser) {
    assertGymAccess(caller, gymId);
    assertPermission(caller, 'badges.manage');

    return this.repo.createCustomBadge(gymId, {
      ...input,
      createdByUserId: caller.sub,
    });
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
