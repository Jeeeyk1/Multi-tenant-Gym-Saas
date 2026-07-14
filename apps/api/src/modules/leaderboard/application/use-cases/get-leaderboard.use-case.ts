import { Injectable } from '@nestjs/common';
import { LeaderboardRepository } from '../../infrastructure/persistence/leaderboard.repository';
import { CacheService } from '../../../../common/cache/cache.service';
import { LEADERBOARD_TTL_SECONDS, leaderboardCacheKey } from '../leaderboard-cache';

@Injectable()
export class GetLeaderboardUseCase {
  constructor(
    private readonly repo: LeaderboardRepository,
    private readonly cache: CacheService,
  ) {}

  getFullLeaderboard(gymId: string) {
    return this.cache.wrap(leaderboardCacheKey(gymId), LEADERBOARD_TTL_SECONDS, () =>
      this.repo.getFullLeaderboard(gymId),
    );
  }

  getExerciseLeaderboard(gymId: string, exerciseId: string) {
    return this.repo.getExerciseLeaderboard(gymId, exerciseId);
  }
}
