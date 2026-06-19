import { Injectable } from '@nestjs/common';
import { ForbiddenError, NotFoundError } from '../../../../common/errors';
import { WorkoutsRepository } from '../../infrastructure/persistence/workouts.repository';
import type { AuthenticatedUser } from '../../../../common/types/auth.types';

@Injectable()
export class ListWorkoutSessionsUseCase {
  constructor(private readonly repo: WorkoutsRepository) {}

  async execute(gymId: string, page: number, limit: number, caller: AuthenticatedUser) {
    if (caller.type !== 'gym') {
      throw new ForbiddenError('Only gym members can view workout sessions', 'FORBIDDEN');
    }

    const member = await this.repo.findMemberByUserId(gymId, caller.sub);
    if (!member) {
      throw new NotFoundError('Member not found in this gym', 'MEMBER_NOT_FOUND');
    }

    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.repo.listSessions(member.id, skip, limit),
      this.repo.countSessions(member.id),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }
}
