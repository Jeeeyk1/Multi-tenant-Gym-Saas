import { Injectable } from '@nestjs/common';
import { LeaderboardRepository } from '../../infrastructure/persistence/leaderboard.repository';

@Injectable()
export class GetLeaderboardConfigUseCase {
  constructor(private readonly repo: LeaderboardRepository) {}

  execute(gymId: string) {
    return this.repo.getLeaderboardConfig(gymId);
  }
}
