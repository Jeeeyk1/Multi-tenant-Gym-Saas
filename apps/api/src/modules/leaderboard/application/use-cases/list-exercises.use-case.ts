import { Injectable } from '@nestjs/common';
import { LeaderboardRepository } from '../../infrastructure/persistence/leaderboard.repository';

@Injectable()
export class ListExercisesUseCase {
  constructor(private readonly repo: LeaderboardRepository) {}

  execute(gymId: string) {
    return this.repo.listExercises(gymId);
  }
}
