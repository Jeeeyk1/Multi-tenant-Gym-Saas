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

    const rows = await this.repo.listEquippedBadgesByGym(gymId);
    return rows.map(({ userId, badges }) => ({
      userId,
      badges,
      // Shape used by app versions before Badges v2.
      badge: { name: badges[0].name, icon: badges[0].icon, color: badges[0].color, rank: badges[0].rank },
    }));
  }
}
