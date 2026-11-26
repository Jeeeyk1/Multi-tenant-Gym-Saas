import { Injectable } from '@nestjs/common';
import { NotFoundError } from '../../../../common/errors';
import { BadgesRepository } from '../../infrastructure/persistence/badges.repository';
import type { AuthenticatedUser } from '../../../../common/types/auth.types';
import { assertGymAccess, assertPermission } from '../../../../common/auth/authorization';
import { Permission } from '../../../../common/enums';

export interface CreateMilestoneBadgeInput {
  exerciseId: string;
  badgeName: string;
  description?: string;
  weightKg: number;
  icon: string;
  color: string;
}

@Injectable()
export class CreateMilestoneBadgeUseCase {
  constructor(private readonly repo: BadgesRepository) {}

  async execute(gymId: string, input: CreateMilestoneBadgeInput, caller: AuthenticatedUser) {
    assertGymAccess(caller, gymId);
    assertPermission(caller, Permission.BADGES_MANAGE);

    // A global lift or one of this gym's own.
    const exercise = await this.repo.findExerciseForGym(gymId, input.exerciseId);
    if (!exercise) throw new NotFoundError('Exercise not found', 'EXERCISE_NOT_FOUND');

    return this.repo.createMilestoneBadge(gymId, {
      ...input,
      createdByUserId: caller.sub,
    });
  }
}
