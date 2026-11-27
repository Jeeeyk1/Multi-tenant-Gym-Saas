import { Injectable } from '@nestjs/common';
import { AdminRepository } from '../../infrastructure/persistence/admin.repository';

export interface ListUsersFilters {
  page?: number;
  limit?: number;
  search?: string;
  gymId?: string;
}

@Injectable()
export class ListUsersUseCase {
  constructor(private readonly repo: AdminRepository) {}

  async execute({ page = 1, limit = 20, search, gymId }: ListUsersFilters = {}) {
    const [users, total] = await this.repo.listUsers(page, limit, { search, gymId });
    return { users, total, page, limit, pages: Math.ceil(total / limit) };
  }
}
