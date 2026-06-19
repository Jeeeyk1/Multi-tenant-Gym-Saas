import { Injectable } from '@nestjs/common';
import { AdminRepository } from '../../infrastructure/persistence/admin.repository';

export interface UpdatePlanInput {
  name?: string;
  description?: string;
  priceMonthly?: number;
  priceYearly?: number;
  features?: string[];
  isPopular?: boolean;
  isActive?: boolean;
  sortOrder?: number;
}

@Injectable()
export class UpdatePlanUseCase {
  constructor(private readonly repo: AdminRepository) {}

  execute(id: string, input: UpdatePlanInput) {
    return this.repo.updatePlan(id, input);
  }
}
