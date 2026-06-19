import { Injectable } from '@nestjs/common';
import { ForbiddenError, NotFoundError } from '../../../../common/errors';
import { LeaderboardRepository } from '../../infrastructure/persistence/leaderboard.repository';
import { BadgesService } from '../../../badges/badges.service';
import type { AuthenticatedUser } from '../../../../common/types/auth.types';

interface ConfigItem {
  exerciseId: string;
  isActive: boolean;
  displayOrder: number;
}

@Injectable()
export class UpdateLeaderboardConfigUseCase {
  constructor(
    private readonly repo: LeaderboardRepository,
    private readonly badges: BadgesService,
  ) {}

  async execute(gymId: string, items: ConfigItem[], caller: AuthenticatedUser) {
    assertGymAccess(caller, gymId);
    assertPermission(caller, 'leaderboard.manage');

    for (const item of items) {
      const exercise = await this.repo.findExerciseById(item.exerciseId);
      if (!exercise || !exercise.isActive) {
        throw new NotFoundError(
          `Exercise ${item.exerciseId} not found`,
          'EXERCISE_NOT_FOUND',
        );
      }
      if (exercise.gymId !== null && exercise.gymId !== gymId) {
        throw new NotFoundError(
          `Exercise ${item.exerciseId} not found`,
          'EXERCISE_NOT_FOUND',
        );
      }
      await this.repo.upsertLeaderboardExercise(
        gymId,
        item.exerciseId,
        item.isActive,
        item.displayOrder,
        caller.sub,
      );
    }

    const hasActiveItem = items.some((i) => i.isActive);
    if (hasActiveItem) {
      void this.badges.ensureCycleExists(gymId);
    }

    return this.repo.getLeaderboardConfig(gymId);
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
