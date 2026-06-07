import { Injectable } from '@nestjs/common';
import { ForbiddenError } from '../../../../common/errors';
import { CheckInsRepository } from '../../infrastructure/persistence/check-ins.repository';
import type { AuthenticatedUser } from '../../../../common/types/auth.types';

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

@Injectable()
export class ListMyCheckInsUseCase {
  constructor(private readonly repo: CheckInsRepository) {}

  async execute(gymId: string, query: { limit?: number }, caller: AuthenticatedUser) {
    if (caller.type === 'gym' && caller.gymId !== gymId) {
      throw new ForbiddenError('Access denied to this gym', 'GYM_ACCESS_DENIED');
    }
    if (caller.type === 'gym' && !caller.permissions.includes('checkins.self')) {
      throw new ForbiddenError('Missing permission: checkins.self', 'PERMISSION_DENIED');
    }

    const limit = Math.min(MAX_LIMIT, Math.max(1, query.limit ?? DEFAULT_LIMIT));
    return this.repo.listCheckinsByUserId(gymId, caller.sub, limit);
  }
}
