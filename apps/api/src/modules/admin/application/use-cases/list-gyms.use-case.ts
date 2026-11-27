import { Injectable } from '@nestjs/common';
import { AdminRepository } from '../../infrastructure/persistence/admin.repository';
import type { GymStatus } from '../../../../common/enums';

export interface ListGymsFilters {
  page?: number;
  limit?: number;
  search?: string;
  status?: GymStatus;
}

@Injectable()
export class ListGymsUseCase {
  constructor(private readonly repo: AdminRepository) {}

  async execute({ page = 1, limit = 20, search, status }: ListGymsFilters = {}) {
    const [gyms, total] = await this.repo.listGyms(page, limit, { search, status });
    return { gyms, total, page, limit, pages: Math.ceil(total / limit) };
  }
}
