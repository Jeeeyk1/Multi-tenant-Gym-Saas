import { Injectable } from '@nestjs/common';
import { ForbiddenError, NotFoundError } from '../../../../common/errors';
import { PrSubmissionStatus, PrSubmissionType } from '../../../../common/enums';
import { calculateEstimated1rm } from '../../domain/pr-calculator';
import { LeaderboardRepository } from '../../infrastructure/persistence/leaderboard.repository';
import type { AuthenticatedUser } from '../../../../common/types/auth.types';

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
  constructor(private readonly repo: LeaderboardRepository) {}

  async execute(gymId: string, input: SubmitPrInput, caller: AuthenticatedUser) {
    assertGymAccess(caller, gymId);

    const isStaffSubmission = !!input.targetMemberId;

    if (isStaffSubmission) {
      assertPermission(caller, 'leaderboard.review');
    } else {
      assertPermission(caller, 'leaderboard.submit');
    }

    // Resolve the member being submitted for
    let memberId: string;
    if (isStaffSubmission) {
      memberId = input.targetMemberId!;
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

    return this.repo.createSubmission({
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
