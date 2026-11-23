/**
 * Everyday activity outside planned training — drives the TDEE multiplier in
 * the fitness-plan calculator. Experience with training is a separate field
 * (ExperienceLevel).
 */
export enum ActivityLevel {
  SEDENTARY   = 'SEDENTARY',
  LIGHT       = 'LIGHT',
  MODERATE    = 'MODERATE',
  VERY_ACTIVE = 'VERY_ACTIVE',
  ATHLETE     = 'ATHLETE',
}
