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
      const earned: string[] = [];
      for (const milestone of milestones) {
        if (Number(milestone.weightKg) > weightKg) continue;
        if (await this.repo.awardMilestoneBadge(memberId, gymId, milestone.id)) earned.push(milestone.badgeName);
      }
      void this.notifier.notify(memberId, earned);
    } catch (err) {
      this.logger.error(
        `checkMilestoneBadge failed for member ${memberId}`,
        err instanceof Error ? err.message : String(err),
      );
    }
  }
}
