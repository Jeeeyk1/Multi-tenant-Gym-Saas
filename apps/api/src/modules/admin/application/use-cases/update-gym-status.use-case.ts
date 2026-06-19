import { Injectable } from '@nestjs/common';
import { AdminRepository } from '../../infrastructure/persistence/admin.repository';

@Injectable()
export class UpdateGymStatusUseCase {
  constructor(private readonly repo: AdminRepository) {}

  async execute(gymId: string, status: 'ACTIVE' | 'SUSPENDED') {
    return this.repo.updateGymStatus(gymId, status);
  }
}
