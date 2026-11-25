import { Injectable, Logger } from '@nestjs/common';
import { ForbiddenError, NotFoundError } from '../../../../common/errors';
import { LeaderboardRepository } from '../../infrastructure/persistence/leaderboard.repository';
import { BadgesService } from '../../../badges/badges.service';
import { CacheService } from '../../../../common/cache/cache.service';
import { leaderboardCacheKey } from '../leaderboard-cache';
import type { AuthenticatedUser } from '../../../../common/types/auth.types';

interface ConfigItem {
  exerciseId: string;
  isActive: boolean;
  displayOrder: number;
}

@Injectable()
export class UpdateLeaderboardConfigUseCase {
  private readonly logger = new Logger(UpdateLeaderboardConfigUseCase.name);

  constructor(
    private readonly repo: LeaderboardRepository,
    private readonly badges: BadgesService,
    private readonly cache: CacheService,
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

    // Enabled exercises / ordering changed — bust the cached board for this gym.
    await this.cache.del(leaderboardCacheKey(gymId));

    const hasActiveItem = items.some((i) => i.isActive);
    if (hasActiveItem) {
      // The config is already saved; a failure here is logged and retried on next use.
      await this.badges.ensureCycleExists(gymId).catch((err) => this.logError('cycle', gymId, err));
      // Newly enabled lifts get a default bronze/silver/gold ladder.
      await this.badges.ensureDefaultLadders(gymId).catch((err) => this.logError('ladders', gymId, err));
    }

    return this.repo.getLeaderboardConfig(gymId);
  }

  private logError(step: string, gymId: string, err: unknown) {
    this.logger.error(`leaderboard ${step} setup failed for gym ${gymId}`, err instanceof Error ? err.message : String(err));
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
