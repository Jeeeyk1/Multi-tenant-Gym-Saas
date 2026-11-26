import { Injectable } from '@nestjs/common';
import { ForbiddenError, NotFoundError } from '../../../../common/errors';
import { PrSubmissionStatus, Permission } from '../../../../common/enums';
import { LeaderboardRepository } from '../../infrastructure/persistence/leaderboard.repository';
import type { AuthenticatedUser } from '../../../../common/types/auth.types';
import { assertGymAccess, assertPermission } from '../../../../common/auth/authorization';

@Injectable()
export class RejectSubmissionUseCase {
  constructor(private readonly repo: LeaderboardRepository) {}

  async execute(
    submissionId: string,
    gymId: string,
    caller: AuthenticatedUser,
    reason: string,
  ) {
    assertGymAccess(caller, gymId);
    assertPermission(caller, Permission.LEADERBOARD_REVIEW);

    const submission = await this.repo.findSubmissionById(submissionId, gymId);
    if (!submission) {
      throw new NotFoundError('Submission not found', 'SUBMISSION_NOT_FOUND');
    }
    if (submission.status !== PrSubmissionStatus.PENDING) {
      throw new ForbiddenError('Submission is not pending', 'SUBMISSION_NOT_PENDING');
    }
    return this.repo.rejectSubmission(submissionId, caller.sub, reason);
  }
}
