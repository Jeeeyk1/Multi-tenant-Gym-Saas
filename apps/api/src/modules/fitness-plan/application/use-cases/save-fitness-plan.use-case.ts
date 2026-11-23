import { Injectable } from '@nestjs/common';
import type { GoalPace } from '../../../../common/enums';
import { FitnessPlanRepository } from '../../infrastructure/persistence/fitness-plan.repository';
import { buildFitnessPlanOptions } from '../../domain/fitness-plan.calculator';
import { loadPlanInput, planDataForPace, toPlanView, type FitnessPlanView } from '../plan-input';

/**
 * Calculates the plan for the chosen pace and stores it as the member's active plan.
 * Recalculates from the stored profile rather than trusting numbers from the client.
 */
@Injectable()
export class SaveFitnessPlanUseCase {
  constructor(private readonly repo: FitnessPlanRepository) {}

  async execute(
    gymId: string,
    memberId: string,
    pace?: GoalPace,
  ): Promise<FitnessPlanView & { adviseProfessional: boolean }> {
    const { member, input } = await loadPlanInput(this.repo, gymId, memberId, new Date());
    const result = buildFitnessPlanOptions(input);
    const plan = await this.repo.createPlan(planDataForPace(member, input, result, pace));

    return { ...toPlanView(plan), adviseProfessional: result.adviseProfessional };
  }
}
