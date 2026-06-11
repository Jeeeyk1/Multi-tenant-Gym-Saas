import { Injectable } from '@nestjs/common';
import { LeaderboardRepository } from '../../infrastructure/persistence/leaderboard.repository';

@Injectable()
export class GetLeaderboardUseCase {
  constructor(private readonly repo: LeaderboardRepository) {}

  getFullLeaderboard(gymId: string) {
    return this.repo.getFullLeaderboard(gymId);
  }

  getExerciseLeaderboard(gymId: string, exerciseId: string) {
    return this.repo.getExerciseLeaderboard(gymId, exerciseId);
  }
}
