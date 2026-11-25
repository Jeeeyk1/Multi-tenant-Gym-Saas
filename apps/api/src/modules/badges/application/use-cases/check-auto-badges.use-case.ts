import { Injectable, Logger } from '@nestjs/common';
import { BadgesRepository } from '../../infrastructure/persistence/badges.repository';
import { isCatalogBadgeEarned, type BadgeStats } from '../../domain/badge-stats';
import { loadBadgeStats } from '../badge-stats-loader';
import { BadgeNotifier } from '../badge-notifier';

type AutoBadge = {
  id: string;
  key: string;
  name: string;
  category: string;
  criteriaType: string;
  criteriaValue: number | null;
  isAutoAwarded: boolean;
};

/** Awards any auto badges the member now qualifies for. Runs after check-ins and workouts. */
@Injectable()
export class CheckAutoBadgesUseCase {
  private readonly logger = new Logger(CheckAutoBadgesUseCase.name);

  constructor(
    private readonly repo: BadgesRepository,
    private readonly notifier: BadgeNotifier,
  ) {}

  async execute(memberId: string, gymId: string): Promise<void> {
    try {
      const [catalog, owned] = await Promise.all([
        this.repo.getEnabledBadgeCatalog(gymId),
        this.repo.listOwnedCatalogBadgeIds(memberId),
      ]);
      // Most check-ins earn nothing new; skip loading activity stats when nothing is left to earn.
      const pending = catalog.filter((b) => !owned.has(b.id));
      if (pending.length === 0) return;
      const stats = await loadBadgeStats(this.repo, memberId, gymId, new Date());
      await this.awardFromStats(memberId, gymId, pending, stats);
    } catch (err) {
      this.logger.error(`checkAutoBadges failed gym=${gymId} member=${memberId}`, err instanceof Error ? err.stack : String(err));
    }
  }

  /**
   * Awards the auto badges among `badges` that `stats` qualify for, then sends one push
   * (not awaited). Returns the names of badges that were new.
   */
  async awardFromStats(
    memberId: string,
    gymId: string,
    badges: AutoBadge[],
    stats: BadgeStats,
  ): Promise<string[]> {
    const earned: AutoBadge[] = [];
    for (const badge of badges) {
      if (!badge.isAutoAwarded || !isCatalogBadgeEarned(badge.criteriaType, badge.criteriaValue, stats)) continue;
      if (await this.repo.awardCatalogBadge(memberId, gymId, badge)) earned.push(badge);
    }
    if (earned.length === 0) return [];
    this.logger.log(`badges awarded gym=${gymId} member=${memberId} source=AUTO_SYSTEM keys=[${earned.map((b) => b.key).join(',')}]`);
    const names = earned.map((b) => b.name);
    void this.notifier.notify(memberId, names);
    return names;
  }
}
