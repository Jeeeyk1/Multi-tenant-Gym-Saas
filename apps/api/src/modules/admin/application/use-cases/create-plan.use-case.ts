import { Injectable } from '@nestjs/common';
import { AdminRepository } from '../../infrastructure/persistence/admin.repository';

export interface CreatePlanInput {
  name: string;
  description?: string;
  priceMonthly: number;
  priceYearly?: number;
  features: string[];
  isPopular?: boolean;
  isActive?: boolean;
  sortOrder?: number;
}

@Injectable()
export class CreatePlanUseCase {
  constructor(private readonly repo: AdminRepository) {}

  execute(input: CreatePlanInput) {
    return this.repo.createPlan(input);
  }
}
