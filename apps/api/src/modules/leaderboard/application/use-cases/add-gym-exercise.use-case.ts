import { Injectable } from '@nestjs/common';
import { ConflictError, ForbiddenError } from '../../../../common/errors';
import { LeaderboardRepository } from '../../infrastructure/persistence/leaderboard.repository';
import type { AuthenticatedUser } from '../../../../common/types/auth.types';

@Injectable()
export class AddGymExerciseUseCase {
  constructor(private readonly repo: LeaderboardRepository) {}

  async execute(gymId: string, name: string, category: string, caller: AuthenticatedUser) {
    assertGymAccess(caller, gymId);
    assertPermission(caller, 'leaderboard.manage');

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
