import { Injectable } from '@nestjs/common';
import { ForbiddenError, NotFoundError } from '../../../../common/errors';
import { WorkoutsRepository } from '../../infrastructure/persistence/workouts.repository';
import { BadgesService } from '../../../badges/badges.service';
import type { AuthenticatedUser } from '../../../../common/types/auth.types';

export interface LogSessionInput {
  workoutType: string;
  startedAt: string;
  endedAt: string;
  durationMinutes: number;
  caloriesBurned?: number;
  avgHeartRate?: number;
  notes?: string;
}

@Injectable()
export class LogWorkoutSessionUseCase {
  constructor(
    private readonly repo: WorkoutsRepository,
    private readonly badges: BadgesService,
  ) {}

  async execute(gymId: string, input: LogSessionInput, caller: AuthenticatedUser) {
    if (caller.type !== 'gym') {
      throw new ForbiddenError('Only gym members can log workout sessions', 'FORBIDDEN');
    }

    const member = await this.repo.findMemberByUserId(gymId, caller.sub);
    if (!member) {
      throw new NotFoundError('Member not found in this gym', 'MEMBER_NOT_FOUND');
    }

    const startedAt = new Date(input.startedAt);
    const endedAt = new Date(input.endedAt);

    if (endedAt <= startedAt) {
      throw new ForbiddenError('End time must be after start time', 'INVALID_DURATION');
    }

    const session = await this.repo.logSession({
      memberId: member.id,
      gymId,
      workoutType: input.workoutType,
      startedAt,
      endedAt,
      durationMinutes: input.durationMinutes,
      caloriesBurned: input.caloriesBurned,
      avgHeartRate: input.avgHeartRate,
      notes: input.notes,
    });

    // Fire-and-forget: badge errors must not fail the session log
    void this.badges.checkAuto(member.id, gymId);

    return session;
  }
}
