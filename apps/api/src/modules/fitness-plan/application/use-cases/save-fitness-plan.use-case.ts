import { Injectable } from '@nestjs/common';
import { ValidationError } from '../../../../common/errors';
import { FitnessDirection, type GoalPace } from '../../../../common/enums';
import { FitnessPlanRepository } from '../../infrastructure/persistence/fitness-plan.repository';
import { buildFitnessPlanOptions } from '../../domain/fitness-plan.calculator';
import { loadPlanInput, toPlanView, type FitnessPlanView } from '../plan-input';

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

    let chosen: { pace: GoalPace | null; weeklyRateKg: number; targetDate: string | null; targets: typeof result.maintenance };
    if (result.direction === FitnessDirection.MAINTAIN) {
      if (pace) {
        throw new ValidationError('This goal keeps the current weight, so it has no pace', 'PACE_NOT_APPLICABLE');
      }
      chosen = { pace: null, weeklyRateKg: 0, targetDate: null, targets: result.maintenance };
    } else {
      const selectedPace = pace ?? result.recommendedPace;
      if (!selectedPace) {
        throw new ValidationError('No pace is safe for this goal right now', 'NO_SAFE_PACE');
      }
      const option = result.options.find((o) => o.pace === selectedPace)!;
      if (!option.available) {
        throw new ValidationError(`The ${selectedPace} pace is not available`, 'PACE_UNAVAILABLE');
      }
      chosen = option;
    }

    const plan = await this.repo.createPlan({
      memberId: member.memberId,
      gymId: member.gymId,
      calculatorVersion: result.calculatorVersion,
      sex: input.sex,
      age: input.age,
      heightCm: input.heightCm,
      weightKg: input.weightKg,
      targetWeightKg: input.targetWeightKg,
      activityLevel: input.activityLevel,
      fitnessGoal: input.fitnessGoal,
      direction: result.direction,
      goalPace: chosen.pace,
      bmrKcal: result.bmrKcal,
      tdeeKcal: result.tdeeKcal,
      targetKcal: chosen.targets.kcal,
      proteinG: chosen.targets.proteinG,
      carbsG: chosen.targets.carbsG,
      fatG: chosen.targets.fatG,
      waterMl: chosen.targets.waterMl,
      weeklyRateKg: chosen.weeklyRateKg,
      targetDate: chosen.targetDate,
    });

    return { ...toPlanView(plan), adviseProfessional: result.adviseProfessional };
  }
}
