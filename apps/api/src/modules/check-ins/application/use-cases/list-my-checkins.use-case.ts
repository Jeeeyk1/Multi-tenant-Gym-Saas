import { Injectable } from '@nestjs/common';
import { CheckInsRepository } from '../../infrastructure/persistence/check-ins.repository';
import type { AuthenticatedUser } from '../../../../common/types/auth.types';
import { assertGymAccess, assertPermission } from '../../../../common/auth/authorization';
import { Permission } from '../../../../common/enums';

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

@Injectable()
export class ListMyCheckInsUseCase {
  constructor(private readonly repo: CheckInsRepository) {}

  async execute(gymId: string, query: { limit?: number }, caller: AuthenticatedUser) {
    assertGymAccess(caller, gymId);
    assertPermission(caller, Permission.CHECKINS_SELF);

    const limit = Math.min(MAX_LIMIT, Math.max(1, query.limit ?? DEFAULT_LIMIT));
    return this.repo.listCheckinsByUserId(gymId, caller.sub, limit);
  }
}
