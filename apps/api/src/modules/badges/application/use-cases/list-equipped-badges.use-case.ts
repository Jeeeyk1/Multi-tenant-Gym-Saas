import { Injectable } from '@nestjs/common';
import { BadgesRepository } from '../../infrastructure/persistence/badges.repository';
import type { AuthenticatedUser } from '../../../../common/types/auth.types';
import { assertGymAccess } from '../../../../common/auth/authorization';

@Injectable()
export class ListEquippedBadgesUseCase {
  constructor(private readonly repo: BadgesRepository) {}

  async execute(gymId: string, caller: AuthenticatedUser) {
    assertGymAccess(caller, gymId);

    const rows = await this.repo.listEquippedBadgesByGym(gymId);
    return rows.map(({ userId, badges }) => ({
      userId,
      badges,
      // Shape used by app versions before Badges v2.
      badge: { name: badges[0].name, icon: badges[0].icon, color: badges[0].color, rank: badges[0].rank },
    }));
  }
}
