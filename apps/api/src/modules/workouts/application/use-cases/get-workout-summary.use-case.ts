import { Injectable } from '@nestjs/common';
import { ForbiddenError, NotFoundError } from '../../../../common/errors';
import { WorkoutsRepository } from '../../infrastructure/persistence/workouts.repository';
import type { AuthenticatedUser } from '../../../../common/types/auth.types';
import { assertGymAccess } from '../../../../common/auth/authorization';

/** All-time totals for the caller's workout sessions (Train's "All Time" card). */
@Injectable()
export class GetWorkoutSummaryUseCase {
  constructor(private readonly repo: WorkoutsRepository) {}

  async execute(gymId: string, caller: AuthenticatedUser) {
    if (caller.type !== 'gym') {
      throw new ForbiddenError('Only gym members can view workout sessions', 'FORBIDDEN');
    }
    assertGymAccess(caller, gymId);

    const member = await this.repo.findMemberByUserId(gymId, caller.sub);
    if (!member) {
      throw new NotFoundError('Member not found in this gym', 'MEMBER_NOT_FOUND');
    }

    return this.repo.summarizeSessions(member.id);
  }
}
