/** Inputs that cannot produce a fitness plan. Each is returned as a 422 with this code. */
export enum FitnessPlanInputProblem {
  /** Age, height or weight outside PROFILE_LIMITS (e.g. saved before the limits were tightened). */
  PROFILE_OUT_OF_RANGE       = 'PROFILE_OUT_OF_RANGE',
  /** Losing weight needs an end point so the plan never runs below a healthy BMI. */
  TARGET_WEIGHT_REQUIRED     = 'TARGET_WEIGHT_REQUIRED',
  /** e.g. goal LOSE_WEIGHT with a target weight above the current weight. */
  TARGET_CONFLICTS_WITH_GOAL = 'TARGET_CONFLICTS_WITH_GOAL',
  /** Current BMI is already below the healthy range. */
  LOSS_NOT_RECOMMENDED       = 'LOSS_NOT_RECOMMENDED',
  /** The target weight would put BMI below the healthy range. */
  TARGET_BELOW_HEALTHY_RANGE = 'TARGET_BELOW_HEALTHY_RANGE',
}
