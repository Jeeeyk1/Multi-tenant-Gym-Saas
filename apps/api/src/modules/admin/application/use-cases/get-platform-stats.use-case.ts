import { Injectable } from '@nestjs/common';
import { AdminRepository } from '../../infrastructure/persistence/admin.repository';

export interface PlatformStats {
  totalGyms: number;
  totalMembers: number;
  checkInsToday: number;
  activeGyms: number;
  totalUsers: number;
}

@Injectable()
export class GetPlatformStatsUseCase {
  constructor(private readonly repo: AdminRepository) {}

  async execute(): Promise<PlatformStats> {
    const [totalGyms, totalMembers, checkInsToday, activeGyms, totalUsers] =
      await this.repo.getPlatformStats();
    return { totalGyms, totalMembers, checkInsToday, activeGyms, totalUsers };
  }
}
