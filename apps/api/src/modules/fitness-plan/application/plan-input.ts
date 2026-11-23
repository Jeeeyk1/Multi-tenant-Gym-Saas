import { NotFoundError, ValidationError } from '../../../common/errors';
import {
  ActivityLevel,
  FitnessDirection,
  FitnessGoal,
  FitnessPlanInputProblem,
  type GoalPace,
  Sex,
} from '../../../common/enums';
import { localDate } from '../../../common/time/local-date';
import {
  findInputProblem,
  type DailyTargets,
  type FitnessPlanInput,
  type FitnessPlanOptions,
} from '../domain/fitness-plan.calculator';
import type {
  CreateFitnessPlanData,
  FitnessPlanMember,
  FitnessPlanRepository,
  StoredFitnessPlan,
} from '../infrastructure/persistence/fitness-plan.repository';

const PROBLEM_MESSAGES: Record<FitnessPlanInputProblem, string> = {
  [FitnessPlanInputProblem.TARGET_CONFLICTS_WITH_GOAL]:
    'The target weight does not match the goal. Update the goal or the target weight.',
  [FitnessPlanInputProblem.LOSS_NOT_RECOMMENDED]:
    'Weight loss is not recommended at the current weight.',
  [FitnessPlanInputProblem.PROFILE_OUT_OF_RANGE]:
    'Age, height or weight is outside the range the plan supports. Please update the profile.',
  [FitnessPlanInputProblem.TARGET_WEIGHT_REQUIRED]:
    'Set a target weight to get a weight-loss plan.',
  [FitnessPlanInputProblem.TARGET_BELOW_HEALTHY_RANGE]:
    'The target weight is below the healthy range for this height.',
};

const REQUIRED_FIELDS = ['sex', 'age', 'heightCm', 'weightKg', 'activityLevel', 'fitnessGoal'] as const;

/**
 * Loads the member and turns their profile into calculator input, or throws the
 * error the client should show. Shared by the options and save use cases so both
 * apply the same checks.
 */
export async function loadPlanInput(
  repo: FitnessPlanRepository,
  gymId: string,
  memberId: string,
  now: Date,
): Promise<{ member: FitnessPlanMember; input: FitnessPlanInput }> {
  const member = await repo.findMember(memberId, gymId);
  if (!member) throw new NotFoundError('Member not found', 'MEMBER_NOT_FOUND');

  const profile = member.profile;
  if (!profile?.healthDataConsentAt) {
    throw new ValidationError(
      'Consent to use health data is required before a plan can be calculated',
      'HEALTH_DATA_CONSENT_REQUIRED',
    );
  }

  const missing = REQUIRED_FIELDS.filter((field) => profile[field] === null);
  if (missing.length > 0) {
    throw new ValidationError(`Profile is missing: ${missing.join(', ')}`, 'PROFILE_INCOMPLETE');
  }

  const input: FitnessPlanInput = {
    sex: profile.sex as Sex,
    age: profile.age!,
    heightCm: profile.heightCm!,
    weightKg: profile.weightKg!,
    targetWeightKg: profile.targetWeightKg,
    activityLevel: profile.activityLevel as ActivityLevel,
    fitnessGoal: profile.fitnessGoal as FitnessGoal,
    healthCaution: profile.healthCaution,
    today: localDate(now, member.timezone),
  };

  const problem = findInputProblem(input);
  if (problem) throw new ValidationError(PROBLEM_MESSAGES[problem], problem);

  return { member, input };
}

/** API shape of a saved plan: plain numbers and a YYYY-MM-DD goal date. */
export function toPlanView(plan: StoredFitnessPlan) {
  return {
    ...plan,
    weightKg: Number(plan.weightKg),
    targetWeightKg: plan.targetWeightKg === null ? null : Number(plan.targetWeightKg),
    weeklyRateKg: Number(plan.weeklyRateKg),
    targetDate: plan.targetDate ? plan.targetDate.toISOString().slice(0, 10) : null,
  };
}

export type FitnessPlanView = ReturnType<typeof toPlanView>;

/**
 * The row to store for a pace. `pace` defaults to the recommended one and must be
 * omitted for maintenance. Throws the 422 the client should show when it can't be used.
 */
export function planDataForPace(
  member: FitnessPlanMember,
  input: FitnessPlanInput,
  result: FitnessPlanOptions,
  pace?: GoalPace | null,
): CreateFitnessPlanData {
  let chosen: { pace: GoalPace | null; weeklyRateKg: number; targetDate: string | null; targets: DailyTargets };
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

  return {
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
  };
}
