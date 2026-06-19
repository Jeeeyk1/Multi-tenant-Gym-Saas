import { Injectable } from '@nestjs/common';
import { AdminRepository } from '../../infrastructure/persistence/admin.repository';

@Injectable()
export class ListUsersUseCase {
  constructor(private readonly repo: AdminRepository) {}

  async execute(page = 1, limit = 20, gymId?: string) {
    const [users, total] = await this.repo.listUsers(page, limit, gymId);
    return { users, total, page, limit, pages: Math.ceil(total / limit) };
  }
}
