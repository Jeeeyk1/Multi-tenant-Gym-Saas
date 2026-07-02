import { Injectable } from '@nestjs/common';
import { CheckAutoBadgesUseCase } from './application/use-cases/check-auto-badges.use-case';
import { CheckMilestoneBadgeUseCase } from './application/use-cases/check-milestone-badge.use-case';
import { BadgesRepository } from './infrastructure/persistence/badges.repository';

/**
 * Thin facade exported for cross-module injection.
 * WorkoutsModule and CheckInsModule call checkAuto.
 * LeaderboardModule calls checkMilestone after approving a PR.
 * LeaderboardModule calls ensureCycleExists when activating exercises.
 */
@Injectable()
export class BadgesService {
  constructor(
    private readonly checkAutoUseCase: CheckAutoBadgesUseCase,
    private readonly checkMilestoneUseCase: CheckMilestoneBadgeUseCase,
    private readonly repo: BadgesRepository,
  ) {}

  checkAuto(memberId: string, gymId: string): Promise<void> {
    return this.checkAutoUseCase.execute(memberId, gymId);
  }

  checkMilestone(
    memberId: string,
    gymId: string,
    exerciseId: string,
    weightKg: number,
  ): Promise<void> {
    return this.checkMilestoneUseCase.execute(memberId, gymId, exerciseId, weightKg);
  }

  async ensureCycleExists(gymId: string): Promise<void> {
    const existing = await this.repo.getActiveCycle(gymId);
    if (!existing) {
      await this.repo.createCycle(gymId);
    }
  }

  getOldActiveCycles(olderThanDays: number) {
    return this.repo.getOldActiveCycles(olderThanDays);
  }
}
