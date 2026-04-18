import { Injectable } from '@nestjs/common';
import { ForbiddenError, NotFoundError } from '../../../../common/errors';
import { MembershipPlansRepository } from '../../infrastructure/persistence/membership-plans.repository';
import type { AuthenticatedUser } from '../../../../common/types/auth.types';

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
  constructor(private readonly repo: MembershipPlansRepository) {}

  async execute(
    gymId: string,
    planId: string,
    input: UpdatePlanInput,
    caller: AuthenticatedUser,
  ) {
    assertGymAccess(caller, gymId);
    assertPermission(caller, 'gym.settings');

    const plan = await this.repo.findById(planId, gymId);
    if (!plan) {
      throw new NotFoundError('Membership plan not found', 'PLAN_NOT_FOUND');
    }

    return this.repo.update(planId, input);
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
