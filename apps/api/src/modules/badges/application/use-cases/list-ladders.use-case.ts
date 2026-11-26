import { Injectable } from '@nestjs/common';
import { BadgesRepository } from '../../infrastructure/persistence/badges.repository';
import { LadderService } from '../ladder.service';
import { LADDER_TIERS, defaultLadder, type LadderWeights } from '../../domain/lift-ladder';
import type { AuthenticatedUser } from '../../../../common/types/auth.types';
import { assertGymAccess, assertPermission } from '../../../../common/auth/authorization';
import { Permission } from '../../../../common/enums';

export interface LadderView {
  exercise: { id: string; name: string };
  /** False when staff switched the ladder off. */
  enabled: boolean;
  weights: LadderWeights | null;
  suggested: LadderWeights;
}

/** The gym's leaderboard lifts and their ladders, for the staff editor. */
@Injectable()
export class ListLaddersUseCase {
  constructor(
    private readonly repo: BadgesRepository,
    private readonly ladders: LadderService,
  ) {}

  async execute(gymId: string, caller: AuthenticatedUser): Promise<LadderView[]> {
    assertGymAccess(caller, gymId);
    assertPermission(caller, Permission.LEADERBOARD_MANAGE);

    await this.ladders.ensureDefaultLadders(gymId);
    const lifts = await this.repo.listLadders(gymId);
    return lifts.map(({ exercise }) => {
      const rungs = new Map(exercise.milestoneBadges.map((m) => [m.tier, Number(m.weightKg)]));
      const complete = LADDER_TIERS.every((t) => rungs.has(t));
      return {
        exercise: { id: exercise.id, name: exercise.name },
        enabled: complete,
        weights: complete ? { BRONZE: rungs.get('BRONZE')!, SILVER: rungs.get('SILVER')!, GOLD: rungs.get('GOLD')! } : null,
        suggested: defaultLadder(exercise),
      };
    });
  }
}
