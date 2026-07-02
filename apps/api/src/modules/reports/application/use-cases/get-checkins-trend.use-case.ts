import { Injectable } from '@nestjs/common';
import { ForbiddenError } from '../../../../common/errors';
import { ReportsRepository } from '../../infrastructure/persistence/reports.repository';
import type { AuthenticatedUser } from '../../../../common/types/auth.types';

export interface CheckinsTrendPoint {
  date: string;
  count: number;
}

@Injectable()
export class GetCheckinsTrendUseCase {
  constructor(private readonly repo: ReportsRepository) {}

  async execute(gymId: string, days: number, caller: AuthenticatedUser): Promise<CheckinsTrendPoint[]> {
    assertGymAccess(caller, gymId);
    assertPermission(caller, 'reports.view');

    const rows = await this.repo.getCheckinsTrend(gymId, days);
    return rows.map((row) => ({
      date: row.date.toISOString().slice(0, 10),
      count: row.count,
    }));
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
