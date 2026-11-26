import { Injectable } from '@nestjs/common';
import { ConflictError } from '../../../../common/errors';
import { LeaderboardRepository } from '../../infrastructure/persistence/leaderboard.repository';
import type { AuthenticatedUser } from '../../../../common/types/auth.types';
import { assertGymAccess, assertPermission } from '../../../../common/auth/authorization';
import { Permission } from '../../../../common/enums';

@Injectable()
export class AddGymExerciseUseCase {
  constructor(private readonly repo: LeaderboardRepository) {}

  async execute(gymId: string, name: string, category: string, caller: AuthenticatedUser) {
    assertGymAccess(caller, gymId);
    assertPermission(caller, Permission.LEADERBOARD_MANAGE);

    const existing = await this.repo.listExercises(gymId);
    const duplicate = existing.find(
      (e) => e.name.toLowerCase() === name.toLowerCase(),
    );
    if (duplicate) {
      throw new ConflictError(
        `An exercise named "${name}" already exists`,
        'EXERCISE_NAME_CONFLICT',
      );
    }
    return this.repo.createGymExercise(gymId, name, category);
  }
}
