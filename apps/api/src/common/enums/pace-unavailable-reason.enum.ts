/** Why a goal-pace option is offered but cannot be chosen. */
export enum PaceUnavailableReason {
  /** Members under 18 only get the gentlest pace. */
  UNDER_18           = 'UNDER_18',
  /** Member reported pregnancy or a medical condition. */
  HEALTH_CAUTION     = 'HEALTH_CAUTION',
  /**
   * The calorie floor or the 1%-of-bodyweight weekly cap stops this pace from being
   * meaningfully faster than the one before it.
   */
  SAFE_LIMIT_REACHED = 'SAFE_LIMIT_REACHED',
}
