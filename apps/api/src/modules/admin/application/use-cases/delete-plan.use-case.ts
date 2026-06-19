import { Injectable } from '@nestjs/common';
import { AdminRepository } from '../../infrastructure/persistence/admin.repository';

@Injectable()
export class DeletePlanUseCase {
  constructor(private readonly repo: AdminRepository) {}

  execute(id: string) {
    return this.repo.deletePlan(id);
  }
}
