import { Injectable } from '@nestjs/common';
import { FitnessPlanRepository } from '../../infrastructure/persistence/fitness-plan.repository';
import { buildFitnessPlanOptions, type FitnessPlanOptions } from '../../domain/fitness-plan.calculator';
import { loadPlanInput } from '../plan-input';

/** Every pace option for the member's current profile. Nothing is saved. */
@Injectable()
export class GetFitnessPlanOptionsUseCase {
  constructor(private readonly repo: FitnessPlanRepository) {}

  async execute(gymId: string, memberId: string): Promise<FitnessPlanOptions> {
    const { input } = await loadPlanInput(this.repo, gymId, memberId, new Date());
    return buildFitnessPlanOptions(input);
  }
}
