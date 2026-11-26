import { Injectable } from '@nestjs/common';
import { BadgesRepository } from '../../infrastructure/persistence/badges.repository';
import type { AuthenticatedUser } from '../../../../common/types/auth.types';
import { assertGymAccess } from '../../../../common/auth/authorization';

@Injectable()
export class ListMilestoneBadgesUseCase {
  constructor(private readonly repo: BadgesRepository) {}

  execute(gymId: string, caller: AuthenticatedUser) {
    assertGymAccess(caller, gymId);
    return this.repo.listMilestoneBadges(gymId);
  }
}
