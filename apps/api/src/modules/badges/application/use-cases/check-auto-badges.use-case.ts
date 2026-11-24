import { Injectable, Logger } from '@nestjs/common';
import { BadgesRepository } from '../../infrastructure/persistence/badges.repository';
import { isCatalogBadgeEarned, type BadgeStats } from '../../domain/badge-stats';
import { loadBadgeStats } from '../badge-stats-loader';
import { BadgeNotifier } from '../badge-notifier';

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
      const [badges, stats] = await Promise.all([
        this.repo.getEnabledBadgeCatalog(gymId),
        loadBadgeStats(this.repo, memberId, gymId, new Date()),
      ]);
      await this.awardFromStats(memberId, gymId, badges, stats);
    } catch (err) {
      this.logger.error(
        `checkAutoBadges failed for member ${memberId}`,
        err instanceof Error ? err.message : String(err),
      );
    }
  }

  /**
   * Awards the auto badges among `badges` that `stats` qualify for, then sends one push
   * (not awaited). Returns the names of badges that were new.
   */
  async awardFromStats(
    memberId: string,
    gymId: string,
    badges: { id: string; name: string; category: string; criteriaType: string; criteriaValue: number | null; isAutoAwarded: boolean }[],
    stats: BadgeStats,
  ): Promise<string[]> {
    const earned: string[] = [];
    for (const badge of badges) {
      if (!badge.isAutoAwarded || !isCatalogBadgeEarned(badge.criteriaType, badge.criteriaValue, stats)) continue;
      if (await this.repo.awardCatalogBadge(memberId, gymId, badge)) earned.push(badge.name);
    }
    void this.notifier.notify(memberId, earned);
    return earned;
  }
}
