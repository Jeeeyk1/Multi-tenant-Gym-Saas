import { Injectable } from '@nestjs/common';
import { AdminRepository } from '../../infrastructure/persistence/admin.repository';

@Injectable()
export class ListBillingPlansUseCase {
  constructor(private readonly repo: AdminRepository) {}

  execute() {
    return this.repo.listBillingPlans();
  }
}
