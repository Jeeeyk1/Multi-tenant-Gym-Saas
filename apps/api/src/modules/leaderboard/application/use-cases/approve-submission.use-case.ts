import { Injectable } from '@nestjs/common';
import { ForbiddenError, NotFoundError } from '../../../../common/errors';
import { PrSubmissionStatus } from '../../../../common/enums';
import { LeaderboardRepository } from '../../infrastructure/persistence/leaderboard.repository';
import { BadgesService } from '../../../badges/badges.service';
import type { AuthenticatedUser } from '../../../../common/types/auth.types';

@Injectable()
export class ApproveSubmissionUseCase {
  constructor(
    private readonly repo: LeaderboardRepository,
    private readonly badges: BadgesService,
  ) {}

  async execute(submissionId: string, gymId: string, caller: AuthenticatedUser) {
    assertGymAccess(caller, gymId);
    assertPermission(caller, 'leaderboard.review');

    const submission = await this.repo.findSubmissionById(submissionId, gymId);
    if (!submission) {
      throw new NotFoundError('Submission not found', 'SUBMISSION_NOT_FOUND');
    }
    if (submission.status !== PrSubmissionStatus.PENDING) {
      throw new ForbiddenError('Submission is not pending', 'SUBMISSION_NOT_PENDING');
    }

    const approved = await this.repo.approveSubmission(submissionId, caller.sub);

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

function assertGymAccess(caller: AuthenticatedUser, gymId: string) {
  if (caller.type === 'gym' && caller.gymId !== gymId) {
    throw new ForbiddenError('Access denied to this gym', 'GYM_ACCESS_DENIED');
  }
}

function assertPermission(caller: AuthenticatedUser, permission: string) {
  if (caller.type === 'gym' && !caller.permissions.includes(permission)) {
    throw new ForbiddenError(`Missing permission: ${permission}`, 'PERMISSION_DENIED');
  }
}
