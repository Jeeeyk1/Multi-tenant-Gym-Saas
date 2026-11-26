import { Injectable, Logger } from '@nestjs/common';
import { NotFoundError, ValidationError } from '../../../../common/errors';
import { BadgesRepository } from '../../infrastructure/persistence/badges.repository';
import { isValidLadder, ladderBadgeDescription, ladderBadgeName, type LadderWeights } from '../../domain/lift-ladder';
import type { AuthenticatedUser } from '../../../../common/types/auth.types';
import { assertGymAccess, assertPermission } from '../../../../common/auth/authorization';
import { Permission } from '../../../../common/enums';

export interface SaveLadderInput {
  enabled: boolean;
  weights?: LadderWeights;
}

/** Staff set a lift's bronze/silver/gold weights, or switch its ladder off. */
@Injectable()
export class SaveLadderUseCase {
  private readonly logger = new Logger(SaveLadderUseCase.name);

  constructor(private readonly repo: BadgesRepository) {}

  async execute(gymId: string, exerciseId: string, input: SaveLadderInput, caller: AuthenticatedUser): Promise<void> {
    assertGymAccess(caller, gymId);
    assertPermission(caller, Permission.LEADERBOARD_MANAGE);

    const exercise = await this.repo.findExerciseForGym(gymId, exerciseId);
    if (!exercise) throw new NotFoundError('Exercise not found', 'EXERCISE_NOT_FOUND');

    if (!input.enabled) {
      await this.repo.disableLadder(gymId, exerciseId);
      this.logger.log(`ladder disabled gym=${gymId} exercise=${exerciseId} by=${caller.sub}`);
      return;
    }
    if (!input.weights || !isValidLadder(input.weights)) {
      throw new ValidationError('Weights must go up from bronze to silver to gold', 'INVALID_LADDER');
    }
    // Ladders are earned through leaderboard PRs, so only leaderboard lifts can have one.
    if (!(await this.repo.isLeaderboardLift(gymId, exerciseId))) {
      throw new ValidationError('Add this lift to the leaderboard before giving it a ladder', 'NOT_A_LEADERBOARD_LIFT');
    }

    const rungs = await this.repo.saveLadder(gymId, exercise, input.weights, caller.sub, {
      name: (tier) => ladderBadgeName(exercise.name, tier),
      description: (weightKg) => ladderBadgeDescription(exercise.name, weightKg),
    });
    // A lowered weight may already be reached by past lifts.
    let credited = 0;
    for (const rung of rungs) credited += await this.repo.awardRungForExistingLifts(gymId, rung);
    const { BRONZE, SILVER, GOLD } = input.weights;
    this.logger.log(
      `ladder saved gym=${gymId} exercise=${exerciseId} by=${caller.sub} kg=${BRONZE}/${SILVER}/${GOLD} credited=${credited}`,
    );
  }
}
