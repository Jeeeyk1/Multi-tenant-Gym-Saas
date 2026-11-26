import { Injectable } from '@nestjs/common';
import { CheckInsRepository } from '../../infrastructure/persistence/check-ins.repository';
import type { AuthenticatedUser } from '../../../../common/types/auth.types';
import { assertGymAccess, assertPermission } from '../../../../common/auth/authorization';
import { Permission } from '../../../../common/enums';

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
    assertPermission(caller, Permission.CHECKINS_VIEW);

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
