import { AiFeature } from '../../../common/enums';

/**
 * How many times one member may use each AI feature per calendar month (in the gym's
 * timezone). Keeps a gym's AI bill bounded.
 */
export const MONTHLY_MEMBER_AI_LIMITS: Record<AiFeature, number> = {
  [AiFeature.WORKOUT_PLAN]: 4,
  [AiFeature.EXERCISE_SWAP]: 30,
  [AiFeature.EXERCISE_INSTRUCTIONS]: 60,
  [AiFeature.MEAL_SUGGESTION]: 30,
  [AiFeature.MEAL_PHOTO]: 20,
  [AiFeature.MEAL_TEXT]: 60,
};
