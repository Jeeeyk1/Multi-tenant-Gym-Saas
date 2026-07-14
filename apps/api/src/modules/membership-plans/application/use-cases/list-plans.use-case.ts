import { Injectable } from '@nestjs/common';
import { ForbiddenError } from '../../../../common/errors';
import { MembershipPlansRepository } from '../../infrastructure/persistence/membership-plans.repository';
import { CacheService } from '../../../../common/cache/cache.service';
import { PLANS_TTL_SECONDS, plansCacheKey } from '../plans-cache';
import type { AuthenticatedUser } from '../../../../common/types/auth.types';

@Injectable()
export class ListPlansUseCase {
  constructor(
    private readonly repo: MembershipPlansRepository,
    private readonly cache: CacheService,
  ) {}

  async execute(gymId: string, caller: AuthenticatedUser) {
    assertGymAccess(caller, gymId);
    assertPermission(caller, 'members.view');
    return this.cache.wrap(plansCacheKey(gymId), PLANS_TTL_SECONDS, () => this.repo.listByGym(gymId));
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
