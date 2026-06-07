import { Injectable } from '@nestjs/common';
import { ForbiddenError } from '../../../../common/errors';
import { CheckInsRepository } from '../../infrastructure/persistence/check-ins.repository';
import type { AuthenticatedUser } from '../../../../common/types/auth.types';

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

@Injectable()
export class ListCheckinHistoryUseCase {
  constructor(private readonly repo: CheckInsRepository) {}

  async execute(
    gymId: string,
    query: { page?: number; limit?: number },
    caller: AuthenticatedUser,
  ) {
    assertGymAccess(caller, gymId);
    assertPermission(caller, 'checkins.view');

    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(MAX_LIMIT, Math.max(1, query.limit ?? DEFAULT_LIMIT));
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.repo.listCheckinHistory(gymId, skip, limit),
      this.repo.countCheckins(gymId),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
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
