import { Injectable, Logger } from '@nestjs/common';
import { BadgesRepository } from '../../infrastructure/persistence/badges.repository';

@Injectable()
export class CheckMilestoneBadgeUseCase {
  private readonly logger = new Logger(CheckMilestoneBadgeUseCase.name);

  constructor(private readonly repo: BadgesRepository) {}

  async execute(
    memberId: string,
    gymId: string,
    exerciseId: string,
    weightKg: number,
  ): Promise<void> {
    try {
      const milestones = await this.repo.getMilestoneBadgesForExercise(gymId, exerciseId);

      for (const milestone of milestones) {
        if (Number(milestone.weightKg) <= weightKg) {
          const already = await this.repo.hasMilestoneBadge(memberId, milestone.id);
          if (!already) {
            await this.repo.awardMilestoneBadge(memberId, gymId, milestone.id);
          }
        }
      }
    } catch (err) {
      this.logger.error(
        `checkMilestoneBadge failed for member ${memberId}`,
        err instanceof Error ? err.message : String(err),
      );
    }
  }
}
