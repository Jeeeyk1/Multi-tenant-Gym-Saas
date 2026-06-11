import { Injectable } from '@nestjs/common';
import { ForbiddenError } from '../../../../common/errors';
import { LeaderboardRepository } from '../../infrastructure/persistence/leaderboard.repository';
import type { AuthenticatedUser } from '../../../../common/types/auth.types';

@Injectable()
export class ListPendingSubmissionsUseCase {
  constructor(private readonly repo: LeaderboardRepository) {}

  execute(gymId: string, caller: AuthenticatedUser) {
    assertGymAccess(caller, gymId);
    assertPermission(caller, 'leaderboard.review');
    return this.repo.listPendingSubmissions(gymId);
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
