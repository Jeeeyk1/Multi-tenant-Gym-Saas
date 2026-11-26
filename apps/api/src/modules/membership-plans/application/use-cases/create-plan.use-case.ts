import { Injectable } from '@nestjs/common';
import { MembershipPlansRepository } from '../../infrastructure/persistence/membership-plans.repository';
import { CacheService } from '../../../../common/cache/cache.service';
import { plansCacheKey } from '../plans-cache';
import type { AuthenticatedUser } from '../../../../common/types/auth.types';
import { assertGymAccess, assertPermission } from '../../../../common/auth/authorization';
import { Permission } from '../../../../common/enums';

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
    assertPermission(caller, Permission.GYM_SETTINGS);
    const plan = await this.repo.create({ gymId, ...input });
    await this.cache.del(plansCacheKey(gymId));
    return plan;
  }
}
