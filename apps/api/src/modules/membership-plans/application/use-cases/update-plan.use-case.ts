import { Injectable } from '@nestjs/common';
import { NotFoundError } from '../../../../common/errors';
import { MembershipPlansRepository } from '../../infrastructure/persistence/membership-plans.repository';
import { CacheService } from '../../../../common/cache/cache.service';
import { plansCacheKey } from '../plans-cache';
import type { AuthenticatedUser } from '../../../../common/types/auth.types';
import { assertGymAccess, assertPermission } from '../../../../common/auth/authorization';
import { Permission } from '../../../../common/enums';

export interface UpdatePlanInput {
  name?: string;
  type?: string;
  description?: string;
  price?: number;
  durationDays?: number;
  isActive?: boolean;
}

@Injectable()
export class UpdatePlanUseCase {
  constructor(
    private readonly repo: MembershipPlansRepository,
    private readonly cache: CacheService,
  ) {}

  async execute(
    gymId: string,
    planId: string,
    input: UpdatePlanInput,
    caller: AuthenticatedUser,
  ) {
    assertGymAccess(caller, gymId);
    assertPermission(caller, Permission.GYM_SETTINGS);

    const plan = await this.repo.findById(planId, gymId);
    if (!plan) {
      throw new NotFoundError('Membership plan not found', 'PLAN_NOT_FOUND');
    }

    const updated = await this.repo.update(planId, input);
    await this.cache.del(plansCacheKey(gymId));
    return updated;
  }
}
