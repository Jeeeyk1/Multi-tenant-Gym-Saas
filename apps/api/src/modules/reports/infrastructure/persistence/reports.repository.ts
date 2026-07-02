import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../common/prisma/prisma.service';

export interface CheckinsTrendRow {
  date: Date;
  count: number;
}

@Injectable()
export class ReportsRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Daily check-in counts for the last `days` days (inclusive of today),
   * zero-filled for days with no check-ins.
   */
  getCheckinsTrend(gymId: string, days: number): Promise<CheckinsTrendRow[]> {
    return this.prisma.$queryRaw<CheckinsTrendRow[]>`
      SELECT d::date AS date, COUNT(c.id)::int AS count
      FROM generate_series(
        CURRENT_DATE - (${days}::int - 1),
        CURRENT_DATE,
        interval '1 day'
      ) AS d
      LEFT JOIN check_ins c
        ON c.gym_id = ${gymId}::uuid
        AND c.checked_in_at::date = d::date
      GROUP BY d
      ORDER BY d;
    `;
  }
}
