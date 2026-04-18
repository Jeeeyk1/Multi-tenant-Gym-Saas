import { Injectable } from '@nestjs/common';
import { ForbiddenError } from '../../../../common/errors';
import { MembershipPlansRepository } from '../../infrastructure/persistence/membership-plans.repository';
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
  constructor(private readonly repo: MembershipPlansRepository) {}

  async execute(gymId: string, input: CreatePlanInput, caller: AuthenticatedUser) {
    assertGymAccess(caller, gymId);
    assertPermission(caller, 'gym.settings');
    return this.repo.create({ gymId, ...input });
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
