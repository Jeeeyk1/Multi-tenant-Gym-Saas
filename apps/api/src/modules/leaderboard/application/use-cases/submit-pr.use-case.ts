import { Injectable } from '@nestjs/common';
import { ForbiddenError, NotFoundError } from '../../../../common/errors';
import { PrSubmissionStatus, PrSubmissionType, Permission } from '../../../../common/enums';
import { calculateEstimated1rm } from '../../domain/pr-calculator';
import { LeaderboardRepository } from '../../infrastructure/persistence/leaderboard.repository';
import { CacheService } from '../../../../common/cache/cache.service';
import { leaderboardCacheKey } from '../leaderboard-cache';
import type { AuthenticatedUser } from '../../../../common/types/auth.types';
import { assertGymAccess, assertPermission } from '../../../../common/auth/authorization';

export interface SubmitPrInput {
  exerciseId: string;
  weightKg: number;
  reps: number;
  photoUrl: string;
  notes?: string;
  /** Provided only for staff-for-member submission. */
  targetMemberId?: string;
}

@Injectable()
export class SubmitPrUseCase {
  constructor(
    private readonly repo: LeaderboardRepository,
    private readonly cache: CacheService,
  ) {}

  async execute(gymId: string, input: SubmitPrInput, caller: AuthenticatedUser) {
    assertGymAccess(caller, gymId);

    const isStaffSubmission = !!input.targetMemberId;

    if (isStaffSubmission) {
      assertPermission(caller, Permission.LEADERBOARD_REVIEW);
    } else {
      assertPermission(caller, Permission.LEADERBOARD_SUBMIT);
    }

    // Resolve the member being submitted for
    let memberId: string;
    if (isStaffSubmission) {
      // The id comes from the request body — it must be a member of this gym.
      const target = await this.repo.findMemberInGym(input.targetMemberId!, gymId);
      if (!target) throw new NotFoundError('Member not found', 'MEMBER_NOT_FOUND');
      memberId = target.id;
    } else {
      const member = await this.repo.findMemberByUserId(caller.sub, gymId);
      if (!member) throw new NotFoundError('Member not found', 'MEMBER_NOT_FOUND');
      if (member.status !== 'ACTIVE') {
        throw new ForbiddenError('Only active members can submit PRs', 'MEMBER_NOT_ACTIVE');
      }
      memberId = member.id;
    }

    // Verify exercise is available to this gym
    const exercise = await this.repo.findExerciseById(input.exerciseId);
    if (!exercise || !exercise.isActive) {
      throw new NotFoundError('Exercise not found', 'EXERCISE_NOT_FOUND');
    }
    if (exercise.gymId !== null && exercise.gymId !== gymId) {
      throw new NotFoundError('Exercise not found', 'EXERCISE_NOT_FOUND');
    }

    const estimated1rm = calculateEstimated1rm(input.weightKg, input.reps);
    const status = isStaffSubmission
      ? PrSubmissionStatus.APPROVED
      : PrSubmissionStatus.PENDING;
    const submissionType = isStaffSubmission
      ? PrSubmissionType.STAFF
      : PrSubmissionType.SELF;

    const submission = await this.repo.createSubmission({
      gymId,
      memberId,
      exerciseId: input.exerciseId,
      weightKg: input.weightKg,
      reps: input.reps,
      estimated1rm,
      photoUrl: input.photoUrl,
      status,
      submissionType,
      submittedByUserId: caller.sub,
      notes: input.notes,
    });

    // A staff submission is auto-approved and lands on the board immediately —
    // bust the cache. A self-submission is PENDING and doesn't affect the board.
    if (status === PrSubmissionStatus.APPROVED) {
      await this.cache.del(leaderboardCacheKey(gymId));
    }

    return submission;
  }
}
