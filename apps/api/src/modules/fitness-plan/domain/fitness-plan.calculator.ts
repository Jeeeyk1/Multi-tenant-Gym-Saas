import {
  ActivityLevel,
  FitnessDirection,
  FitnessGoal,
  FitnessPlanInputProblem,
  GoalPace,
  PaceUnavailableReason,
  Sex,
} from '../../../common/enums';

/**
 * Deterministic daily targets for a member: calories, macros, water and the date
 * they reach their target weight at a chosen pace. No AI involved.
 *
 * Bump CALCULATOR_VERSION whenever a constant or formula changes; it is stored with
 * every saved plan so old plans can still be explained.
 */
export const CALCULATOR_VERSION = 1;

// Mifflin–St Jeor sex constant. UNSPECIFIED takes the midpoint of the two.
const SEX_CONSTANT: Record<Sex, number> = {
  [Sex.MALE]: 5,
  [Sex.FEMALE]: -161,
  [Sex.UNSPECIFIED]: -78,
};

const ACTIVITY_FACTOR: Record<ActivityLevel, number> = {
  [ActivityLevel.SEDENTARY]: 1.2,
  [ActivityLevel.LIGHT]: 1.375,
  [ActivityLevel.MODERATE]: 1.55,
  [ActivityLevel.VERY_ACTIVE]: 1.725,
  [ActivityLevel.ATHLETE]: 1.9,
};

// Calories never go below max(BMR, this floor).
const KCAL_FLOOR: Record<Sex, number> = {
  [Sex.MALE]: 1500,
  [Sex.FEMALE]: 1200,
  [Sex.UNSPECIFIED]: 1350,
};

const PACE_ORDER = [GoalPace.STEADY, GoalPace.BALANCED, GoalPace.FAST] as const;

const LOSS_RATE_KG_PER_WEEK: Record<GoalPace, number> = {
  [GoalPace.STEADY]: 0.25,
  [GoalPace.BALANCED]: 0.5,
  [GoalPace.FAST]: 0.75,
};
const MAX_LOSS_FRACTION_PER_WEEK = 0.01;

const GAIN_SURPLUS_KCAL: Record<GoalPace, number> = {
  [GoalPace.STEADY]: 150,
  [GoalPace.BALANCED]: 250,
  [GoalPace.FAST]: 400,
};
const GAIN_RATE_KG_PER_MONTH: Record<GoalPace, number> = {
  [GoalPace.STEADY]: 0.25,
  [GoalPace.BALANCED]: 0.35,
  [GoalPace.FAST]: 0.5,
};

const KCAL_PER_KG = 7700;
// A pace must lose at least this much faster than the one before it to be offered.
const MIN_RATE_STEP_KG = 0.05;
// Below this effective loss rate the deficit is too small to call it a plan.
const MIN_LOSS_RATE_KG = 0.1;
// Differences smaller than this between current and target weight count as "no target".
const TARGET_TOLERANCE_KG = 0.5;

const PROTEIN_G_PER_KG_LOSS = 1.8;
const PROTEIN_G_PER_KG_OTHER = 1.6;
const FAT_SHARE_OF_KCAL = 0.25;
const FAT_MIN_G_PER_KG = 0.6;
const WATER_ML_PER_KG = 35;

const BMI_UNDERWEIGHT = 18.5;
const BMI_OBESE = 30;
// Above BMI_OBESE, protein and fat scale with the weight at this BMI instead of the
// actual weight, so targets are not inflated by body fat.
const BMI_REFERENCE = 25;
const ADULT_AGE = 18;

/**
 * Inputs the formulas are valid for. The profile DTO uses the same limits, and
 * migration 0046's CHECK constraints on member_fitness_plans mirror them.
 */
export const PROFILE_LIMITS = {
  age: { min: 13, max: 100 },
  heightCm: { min: 120, max: 230 },
  weightKg: { min: 30, max: 300 },
} as const;

function inRange(value: number, limit: { min: number; max: number }): boolean {
  return value >= limit.min && value <= limit.max;
}

export interface FitnessPlanInput {
  sex: Sex;
  age: number;
  heightCm: number;
  weightKg: number;
  targetWeightKg: number | null;
  activityLevel: ActivityLevel;
  fitnessGoal: FitnessGoal;
  /** Pregnancy or a medical condition was reported. */
  healthCaution: boolean;
  /** Calendar date (YYYY-MM-DD) in the gym's timezone; the goal date counts from here. */
  today: string;
}

export interface DailyTargets {
  kcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  waterMl: number;
}

export interface PaceOption {
  pace: GoalPace;
  available: boolean;
  unavailableReason: PaceUnavailableReason | null;
  /** Signed: negative while losing, positive while gaining. */
  weeklyRateKg: number;
  targets: DailyTargets;
  weeksToGoal: number | null;
  targetDate: string | null;
}

export interface FitnessPlanOptions {
  calculatorVersion: number;
  direction: FitnessDirection;
  bmrKcal: number;
  tdeeKcal: number;
  /** Targets for keeping the current weight. The plan itself when direction is MAINTAIN. */
  maintenance: DailyTargets;
  /** One entry per pace, in STEADY → FAST order. Empty when direction is MAINTAIN. */
  options: PaceOption[];
  recommendedPace: GoalPace | null;
  /** The member should check with a health professional before following the plan. */
  adviseProfessional: boolean;
}

export function bmi(weightKg: number, heightCm: number): number {
  const m = heightCm / 100;
  return weightKg / (m * m);
}

export function bmrKcal(input: Pick<FitnessPlanInput, 'sex' | 'age' | 'heightCm' | 'weightKg'>): number {
  return 10 * input.weightKg + 6.25 * input.heightCm - 5 * input.age + SEX_CONSTANT[input.sex];
}

function hasTarget(input: FitnessPlanInput): boolean {
  return (
    input.targetWeightKg !== null &&
    Math.abs(input.targetWeightKg - input.weightKg) >= TARGET_TOLERANCE_KG
  );
}

/** Which way the member wants to move, before any health caution is applied. */
function requestedDirection(input: FitnessPlanInput): FitnessDirection {
  if (input.fitnessGoal === FitnessGoal.LOSE_WEIGHT) return FitnessDirection.LOSS;
  if (input.fitnessGoal === FitnessGoal.BUILD_MUSCLE) return FitnessDirection.GAIN;
  if (!hasTarget(input)) return FitnessDirection.MAINTAIN;
  return input.targetWeightKg! < input.weightKg ? FitnessDirection.LOSS : FitnessDirection.GAIN;
}

/** Returns the first reason the inputs cannot produce a plan, or null if they can. */
export function findInputProblem(input: FitnessPlanInput): FitnessPlanInputProblem | null {
  if (
    !inRange(input.age, PROFILE_LIMITS.age) ||
    !inRange(input.heightCm, PROFILE_LIMITS.heightCm) ||
    !inRange(input.weightKg, PROFILE_LIMITS.weightKg) ||
    (input.targetWeightKg !== null && !inRange(input.targetWeightKg, PROFILE_LIMITS.weightKg))
  ) {
    return FitnessPlanInputProblem.PROFILE_OUT_OF_RANGE;
  }

  const direction = requestedDirection(input);
  if (hasTarget(input)) {
    const goingDown = input.targetWeightKg! < input.weightKg;
    if (
      (direction === FitnessDirection.LOSS && !goingDown) ||
      (direction === FitnessDirection.GAIN && goingDown)
    ) {
      return FitnessPlanInputProblem.TARGET_CONFLICTS_WITH_GOAL;
    }
  }
  if (direction === FitnessDirection.LOSS) {
    if (bmi(input.weightKg, input.heightCm) < BMI_UNDERWEIGHT) {
      return FitnessPlanInputProblem.LOSS_NOT_RECOMMENDED;
    }
    if (!hasTarget(input)) return FitnessPlanInputProblem.TARGET_WEIGHT_REQUIRED;
    if (hasTarget(input) && bmi(input.targetWeightKg!, input.heightCm) < BMI_UNDERWEIGHT) {
      return FitnessPlanInputProblem.TARGET_BELOW_HEALTHY_RANGE;
    }
  }
  return null;
}

/**
 * Builds the maintenance targets and every pace option. Call findInputProblem first;
 * this function assumes the inputs are usable.
 */
export function buildFitnessPlanOptions(input: FitnessPlanInput): FitnessPlanOptions {
  const bmr = bmrKcal(input);
  const tdee = bmr * ACTIVITY_FACTOR[input.activityLevel];

  let direction = requestedDirection(input);
  // No deficit at all when pregnancy or a medical condition was reported.
  if (direction === FitnessDirection.LOSS && input.healthCaution) {
    direction = FitnessDirection.MAINTAIN;
  }

  const maintenance = dailyTargets(input, roundKcal(tdee), FitnessDirection.MAINTAIN);
  const options =
    direction === FitnessDirection.LOSS
      ? lossOptions(input, bmr, tdee)
      : direction === FitnessDirection.GAIN
        ? gainOptions(input, tdee)
        : [];

  const recommendedPace =
    [GoalPace.BALANCED, GoalPace.STEADY, GoalPace.FAST].find((pace) =>
      options.some((o) => o.pace === pace && o.available),
    ) ?? null;

  const adviseProfessional =
    input.healthCaution || (input.age < ADULT_AGE && direction !== FitnessDirection.MAINTAIN);

  return {
    calculatorVersion: CALCULATOR_VERSION,
    direction,
    bmrKcal: Math.round(bmr),
    tdeeKcal: Math.round(tdee),
    maintenance,
    options,
    recommendedPace,
    adviseProfessional,
  };
}

function restrictedReason(input: FitnessPlanInput, pace: GoalPace): PaceUnavailableReason | null {
  if (pace === GoalPace.STEADY) return null;
  if (input.healthCaution) return PaceUnavailableReason.HEALTH_CAUTION;
  if (input.age < ADULT_AGE) return PaceUnavailableReason.UNDER_18;
  return null;
}

function lossOptions(input: FitnessPlanInput, bmr: number, tdee: number): PaceOption[] {
  const floor = Math.max(bmr, KCAL_FLOOR[input.sex]);
  const maxRate = input.weightKg * MAX_LOSS_FRACTION_PER_WEEK;
  let previousRate = 0;

  return PACE_ORDER.map((pace) => {
    const requestedRate = Math.min(LOSS_RATE_KG_PER_WEEK[pace], maxRate);
    // The floor is rounded up so rounding can never take calories below it.
    const kcal = Math.max(roundKcal(tdee - (requestedRate * KCAL_PER_KG) / 7), Math.ceil(floor / 10) * 10);
    const rate = round2(Math.max(0, ((tdee - kcal) * 7) / KCAL_PER_KG));

    let reason = restrictedReason(input, pace);
    if (!reason && (rate < MIN_LOSS_RATE_KG || rate < previousRate + MIN_RATE_STEP_KG)) {
      reason = PaceUnavailableReason.SAFE_LIMIT_REACHED;
    }
    if (!reason) previousRate = rate;

    return paceOption(input, pace, -rate, dailyTargets(input, kcal, FitnessDirection.LOSS), reason);
  });
}

function gainOptions(input: FitnessPlanInput, tdee: number): PaceOption[] {
  return PACE_ORDER.map((pace) => {
    const kcal = roundKcal(tdee + GAIN_SURPLUS_KCAL[pace]);
    const rate = round2((GAIN_RATE_KG_PER_MONTH[pace] * 12) / 52);
    return paceOption(
      input,
      pace,
      rate,
      dailyTargets(input, kcal, FitnessDirection.GAIN),
      restrictedReason(input, pace),
    );
  });
}

function paceOption(
  input: FitnessPlanInput,
  pace: GoalPace,
  weeklyRateKg: number,
  targets: DailyTargets,
  unavailableReason: PaceUnavailableReason | null,
): PaceOption {
  let weeksToGoal: number | null = null;
  let targetDate: string | null = null;
  if (hasTarget(input) && weeklyRateKg !== 0) {
    weeksToGoal = Math.ceil(Math.abs(input.targetWeightKg! - input.weightKg) / Math.abs(weeklyRateKg));
    targetDate = addDays(input.today, weeksToGoal * 7);
  }
  return {
    pace,
    available: unavailableReason === null,
    unavailableReason,
    weeklyRateKg,
    targets,
    weeksToGoal,
    targetDate,
  };
}

function dailyTargets(input: FitnessPlanInput, kcal: number, direction: FitnessDirection): DailyTargets {
  const referenceWeight =
    bmi(input.weightKg, input.heightCm) >= BMI_OBESE
      ? BMI_REFERENCE * (input.heightCm / 100) ** 2
      : input.weightKg;

  const proteinPerKg = direction === FitnessDirection.LOSS ? PROTEIN_G_PER_KG_LOSS : PROTEIN_G_PER_KG_OTHER;
  const proteinG = Math.round(proteinPerKg * referenceWeight);
  const fatG = Math.round(Math.max((kcal * FAT_SHARE_OF_KCAL) / 9, FAT_MIN_G_PER_KG * referenceWeight));
  const carbsG = Math.max(0, Math.round((kcal - proteinG * 4 - fatG * 9) / 4));
  const waterMl = Math.round((WATER_ML_PER_KG * input.weightKg) / 50) * 50;

  return { kcal, proteinG, carbsG, fatG, waterMl };
}

function roundKcal(kcal: number): number {
  return Math.round(kcal / 10) * 10;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Adds days to a YYYY-MM-DD date without involving any timezone. */
export function addDays(isoDate: string, days: number): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}
