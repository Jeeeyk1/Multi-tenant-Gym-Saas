import { Injectable } from '@nestjs/common';
import { ForbiddenError } from '../../../../common/errors';
import { MembershipPlansRepository } from '../../infrastructure/persistence/membership-plans.repository';
import { CacheService } from '../../../../common/cache/cache.service';
import { plansCacheKey } from '../plans-cache';
import type { AuthenticatedUser } from '../../../../common/types/auth.types';

export interface CreatePlanInput {
  name: string;
  type: string;
  description?: string;
  price: number;
  durationDays: number;
}

@Injectable()
export class CreatePlanUseCase {
  constructor(
    private readonly repo: MembershipPlansRepository,
    private readonly cache: CacheService,
  ) {}

  async execute(gymId: string, input: CreatePlanInput, caller: AuthenticatedUser) {
    assertGymAccess(caller, gymId);
    assertPermission(caller, 'gym.settings');
    const plan = await this.repo.create({ gymId, ...input });
    await this.cache.del(plansCacheKey(gymId));
    return plan;
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
