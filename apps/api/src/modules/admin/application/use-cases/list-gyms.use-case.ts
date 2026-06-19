import { Injectable } from '@nestjs/common';
import { AdminRepository } from '../../infrastructure/persistence/admin.repository';

@Injectable()
export class ListGymsUseCase {
  constructor(private readonly repo: AdminRepository) {}

  async execute(page = 1, limit = 20) {
    const [gyms, total] = await this.repo.listGyms(page, limit);
    return { gyms, total, page, limit, pages: Math.ceil(total / limit) };
  }
}
