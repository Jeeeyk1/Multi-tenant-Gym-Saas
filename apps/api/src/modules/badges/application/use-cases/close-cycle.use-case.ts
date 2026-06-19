import { Injectable, Logger } from '@nestjs/common';
import { BadgesRepository } from '../../infrastructure/persistence/badges.repository';
import { BadgeRank } from '../../../../common/enums';

const RANKS = [BadgeRank.GOLD, BadgeRank.SILVER, BadgeRank.BRONZE] as const;
const CYCLE_BADGE_KEYS: Record<BadgeRank, string> = {
  [BadgeRank.GOLD]:   'CYCLE_GOLD',
  [BadgeRank.SILVER]: 'CYCLE_SILVER',
  [BadgeRank.BRONZE]: 'CYCLE_BRONZE',
};
const CYCLE_EXPIRY_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

@Injectable()
export class CloseCycleUseCase {
  private readonly logger = new Logger(CloseCycleUseCase.name);

  constructor(private readonly repo: BadgesRepository) {}

  async execute(cycleId: string, gymId: string, startedAt: Date): Promise<void> {
    const [, exercises, catalogEntries] = await Promise.all([
      this.repo.closeCycle(cycleId),
      this.repo.getLeaderboardExercises(gymId),
      Promise.all(RANKS.map((r) => this.repo.findBadgeCatalogByKey(CYCLE_BADGE_KEYS[r]))),
    ]);

    const catalogByRank: Partial<Record<BadgeRank, string>> = {};
    for (let i = 0; i < RANKS.length; i++) {
      if (catalogEntries[i]) {
        catalogByRank[RANKS[i]] = catalogEntries[i]!.id;
      }
    }

    const endedAt = new Date();
    const expiresAt = new Date(endedAt.getTime() + CYCLE_EXPIRY_MS);
    const exerciseLabel = startedAt.toLocaleString('en-US', { month: 'short', year: 'numeric' });

    for (const le of exercises) {
      const topMembers = await this.repo.getTopMembersForExercise(
        gymId,
        le.exercise.id,
        startedAt,
        endedAt,
      );

      for (let i = 0; i < topMembers.length; i++) {
        const rank = RANKS[i];
        const catalogId = catalogByRank[rank];
        if (!catalogId) continue;

        await this.repo.awardCycleBadge({
          memberId: topMembers[i].memberId,
          gymId,
          badgeCatalogId: catalogId,
          cycleId,
          rank,
          expiresAt,
          proofNotes: `${exerciseLabel} · ${le.exercise.name}`,
        });
      }
    }

    await this.repo.createCycle(gymId);
    this.logger.log(`Closed cycle ${cycleId} for gym ${gymId}, awarded top-3 for ${exercises.length} exercises`);
  }
}
