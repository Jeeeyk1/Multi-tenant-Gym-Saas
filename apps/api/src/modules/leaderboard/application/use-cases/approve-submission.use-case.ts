import { Injectable } from '@nestjs/common';
import { ForbiddenError, NotFoundError } from '../../../../common/errors';
import { PrSubmissionStatus, Permission } from '../../../../common/enums';
import { LeaderboardRepository } from '../../infrastructure/persistence/leaderboard.repository';
import { BadgesService } from '../../../badges/badges.service';
import { CacheService } from '../../../../common/cache/cache.service';
import { leaderboardCacheKey } from '../leaderboard-cache';
import type { AuthenticatedUser } from '../../../../common/types/auth.types';
import { assertGymAccess, assertPermission } from '../../../../common/auth/authorization';

@Injectable()
export class ApproveSubmissionUseCase {
  constructor(
    private readonly repo: LeaderboardRepository,
    private readonly badges: BadgesService,
    private readonly cache: CacheService,
  ) {}

  async execute(submissionId: string, gymId: string, caller: AuthenticatedUser) {
    assertGymAccess(caller, gymId);
    assertPermission(caller, Permission.LEADERBOARD_REVIEW);

    const submission = await this.repo.findSubmissionById(submissionId, gymId);
    if (!submission) {
      throw new NotFoundError('Submission not found', 'SUBMISSION_NOT_FOUND');
    }
    if (submission.status !== PrSubmissionStatus.PENDING) {
      throw new ForbiddenError('Submission is not pending', 'SUBMISSION_NOT_PENDING');
    }

    const approved = await this.repo.approveSubmission(submissionId, caller.sub);

    // An approval changes the best-1RM ranking — bust the cached board for this gym.
    await this.cache.del(leaderboardCacheKey(gymId));

    // Fire-and-forget: check if this PR unlocks any exercise milestone badge
    void this.badges.checkMilestone(
      approved.member.id,
      gymId,
      approved.exercise.id,
      Number(approved.weightKg),
    );

    return approved;
  }
}
