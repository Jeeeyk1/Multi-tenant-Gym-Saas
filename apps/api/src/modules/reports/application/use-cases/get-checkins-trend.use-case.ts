import { Injectable } from '@nestjs/common';
import { ReportsRepository } from '../../infrastructure/persistence/reports.repository';
import type { AuthenticatedUser } from '../../../../common/types/auth.types';
import { assertGymAccess, assertPermission } from '../../../../common/auth/authorization';
import { Permission } from '../../../../common/enums';

export interface CheckinsTrendPoint {
  date: string;
  count: number;
}

@Injectable()
export class GetCheckinsTrendUseCase {
  constructor(private readonly repo: ReportsRepository) {}

  async execute(gymId: string, days: number, caller: AuthenticatedUser): Promise<CheckinsTrendPoint[]> {
    assertGymAccess(caller, gymId);
    assertPermission(caller, Permission.REPORTS_VIEW);

    const rows = await this.repo.getCheckinsTrend(gymId, days);
    return rows.map((row) => ({
      date: row.date.toISOString().slice(0, 10),
      count: row.count,
    }));
  }
}
