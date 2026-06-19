import { Injectable } from '@nestjs/common';
import { AdminRepository } from '../../infrastructure/persistence/admin.repository';

@Injectable()
export class ListPlansUseCase {
  constructor(private readonly repo: AdminRepository) {}

  execute() {
    return this.repo.listPlans();
  }
}
