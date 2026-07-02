import { Injectable } from '@nestjs/common';
import { ForbiddenError } from '../../../../common/errors';
import { BadgesRepository } from '../../infrastructure/persistence/badges.repository';
import type { AuthenticatedUser } from '../../../../common/types/auth.types';

@Injectable()
export class ListEquippedBadgesUseCase {
  constructor(private readonly repo: BadgesRepository) {}

  async execute(gymId: string, caller: AuthenticatedUser) {
    if (caller.type === 'gym' && caller.gymId !== gymId) {
      throw new ForbiddenError('Access denied to this gym', 'GYM_ACCESS_DENIED');
    }

    return this.repo.listEquippedBadgesByGym(gymId);
  }
}
