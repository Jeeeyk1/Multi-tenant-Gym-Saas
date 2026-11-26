import { Injectable } from '@nestjs/common';
import { MembershipPlansRepository } from '../../infrastructure/persistence/membership-plans.repository';
import { CacheService } from '../../../../common/cache/cache.service';
import { PLANS_TTL_SECONDS, plansCacheKey } from '../plans-cache';
import type { AuthenticatedUser } from '../../../../common/types/auth.types';
import { assertGymAccess, assertPermission } from '../../../../common/auth/authorization';
import { Permission } from '../../../../common/enums';

@Injectable()
export class ListPlansUseCase {
  constructor(
    private readonly repo: MembershipPlansRepository,
    private readonly cache: CacheService,
  ) {}

  async execute(gymId: string, caller: AuthenticatedUser) {
    assertGymAccess(caller, gymId);
    assertPermission(caller, Permission.PLANS_VIEW);
    return this.cache.wrap(plansCacheKey(gymId), PLANS_TTL_SECONDS, () => this.repo.listByGym(gymId));
  }
}
