import { Injectable, Logger } from '@nestjs/common';
import { BadgesRepository } from '../../infrastructure/persistence/badges.repository';
import { BadgeNotifier } from '../badge-notifier';

/**
 * Awards every milestone (and ladder rung) an approved lift reaches. One heavy lift can
 * earn several rungs at once, e.g. straight to gold.
 */
@Injectable()
export class CheckMilestoneBadgeUseCase {
  private readonly logger = new Logger(CheckMilestoneBadgeUseCase.name);

  constructor(
    private readonly repo: BadgesRepository,
    private readonly notifier: BadgeNotifier,
  ) {}

  async execute(memberId: string, gymId: string, exerciseId: string, weightKg: number): Promise<void> {
    try {
      const milestones = await this.repo.getMilestoneBadgesForExercise(gymId, exerciseId);
      const earned: typeof milestones = [];
      for (const milestone of milestones) {
        if (Number(milestone.weightKg) > weightKg) continue;
        if (await this.repo.awardMilestoneBadge(memberId, gymId, milestone.id)) earned.push(milestone);
      }
      if (earned.length === 0) return;
      this.logger.log(
        `badges awarded gym=${gymId} member=${memberId} source=AUTO_MILESTONE exercise=${exerciseId} kg=${weightKg} ` +
          `milestones=[${earned.map((m) => `${m.id}:${m.tier ?? 'single'}`).join(',')}]`,
      );
      void this.notifier.notify(memberId, earned.map((m) => m.badgeName));
    } catch (err) {
      this.logger.error(
        `checkMilestoneBadge failed gym=${gymId} member=${memberId} exercise=${exerciseId} kg=${weightKg}`,
        err instanceof Error ? err.stack : String(err),
      );
    }
  }
}
