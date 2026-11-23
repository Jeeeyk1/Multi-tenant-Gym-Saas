import { NotFoundError, ValidationError } from '../../../common/errors';
import {
  ActivityLevel,
  FitnessGoal,
  FitnessPlanInputProblem,
  Sex,
} from '../../../common/enums';
import { localDate } from '../../../common/time/local-date';
import { findInputProblem, type FitnessPlanInput } from '../domain/fitness-plan.calculator';
import type {
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
