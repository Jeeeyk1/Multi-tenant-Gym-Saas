import { Injectable, Logger } from '@nestjs/common';
import { BadgesRepository, type CycleAward } from '../../infrastructure/persistence/badges.repository';
import { BadgeNotifier } from '../badge-notifier';
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

  constructor(
    private readonly repo: BadgesRepository,
    private readonly notifier: BadgeNotifier,
  ) {}

  async execute(cycleId: string, gymId: string, startedAt: Date): Promise<void> {
    const [exercises, catalogEntries] = await Promise.all([
      this.repo.getLeaderboardExercises(gymId),
      Promise.all(RANKS.map((r) => this.repo.findBadgeCatalogByKey(CYCLE_BADGE_KEYS[r]))),
    ]);
    const catalogByRank = new Map(RANKS.map((rank, i) => [rank, catalogEntries[i]?.id]));

    const endedAt = new Date();
    const expiresAt = new Date(endedAt.getTime() + CYCLE_EXPIRY_MS);
    const cycleLabel = startedAt.toLocaleString('en-US', { month: 'short', year: 'numeric' });

    const awards: CycleAward[] = [];
    const winners: { memberId: string; badge: string }[] = [];
    for (const le of exercises) {
      const topMembers = await this.repo.getTopMembersForExercise(gymId, le.exercise.id, startedAt, endedAt);
      topMembers.forEach((member, i) => {
        const rank = RANKS[i];
        const badgeCatalogId = catalogByRank.get(rank);
        if (!badgeCatalogId) return;
        awards.push({ memberId: member.memberId, badgeCatalogId, rank, expiresAt, proofNotes: `${cycleLabel} · ${le.exercise.name}` });
        winners.push({ memberId: member.memberId, badge: `Cycle Champion ${rank.toLowerCase()} · ${le.exercise.name}` });
      });
    }

    // Close, award and open the next cycle together, so a failure can be retried safely.
    if (!(await this.repo.completeCycle(cycleId, gymId, endedAt, awards))) {
      this.logger.warn(`cycle already closed, skipped cycle=${cycleId} gym=${gymId}`);
      return;
    }
    this.logger.log(
      `cycle closed cycle=${cycleId} gym=${gymId} lifts=${exercises.length} awards=${awards.length} ` +
        `members=[${awards.map((a) => `${a.memberId}:${a.rank}`).join(',')}]`,
    );
    for (const w of winners) void this.notifier.notify(w.memberId, [w.badge]);
  }
}
