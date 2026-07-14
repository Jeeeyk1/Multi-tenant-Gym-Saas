import { Injectable } from '@nestjs/common';
import { AdminRepository } from '../../infrastructure/persistence/admin.repository';
import { BillingRepository } from '../../../billing/infrastructure/persistence/billing.repository';

export interface PlatformStats {
  totalGyms: number;
  totalMembers: number;
  checkInsToday: number;
  activeGyms: number;
  totalUsers: number;
  mrr: number;
  revenueThisMonth: number;
}

@Injectable()
export class GetPlatformStatsUseCase {
  constructor(
    private readonly repo: AdminRepository,
    private readonly billing: BillingRepository,
  ) {}

  async execute(): Promise<PlatformStats> {
    const [[totalGyms, totalMembers, checkInsToday, activeGyms, totalUsers], revenue] = await Promise.all([
      this.repo.getPlatformStats(),
      this.billing.getRevenueStats(),
    ]);
    return { totalGyms, totalMembers, checkInsToday, activeGyms, totalUsers, ...revenue };
  }
}
