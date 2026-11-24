// Mirror of apps/api/src/common/enums — keep values in sync with backend

export enum FitnessGoal {
  LOSE_WEIGHT  = 'LOSE_WEIGHT',
  BUILD_MUSCLE = 'BUILD_MUSCLE',
  GET_FIT      = 'GET_FIT',
  STAY_HEALTHY = 'STAY_HEALTHY',
  OTHER        = 'OTHER',
}

export enum ActivityLevel {
  SEDENTARY   = 'SEDENTARY',
  LIGHT       = 'LIGHT',
  MODERATE    = 'MODERATE',
  VERY_ACTIVE = 'VERY_ACTIVE',
  ATHLETE     = 'ATHLETE',
}

export enum ExperienceLevel {
  BEGINNER     = 'BEGINNER',
  INTERMEDIATE = 'INTERMEDIATE',
  ADVANCED     = 'ADVANCED',
}

export enum PreferredStyle {
  WEIGHTS = 'WEIGHTS',
  CARDIO  = 'CARDIO',
  MIXED   = 'MIXED',
  HIIT    = 'HIIT',
}

export enum DietType {
  NONE         = 'NONE',
  VEGETARIAN   = 'VEGETARIAN',
  VEGAN        = 'VEGAN',
  HALAL        = 'HALAL',
  GLUTEN_FREE  = 'GLUTEN_FREE',
}

// Fitness plan — see apps/api/src/modules/fitness-plan

export enum Sex {
  MALE        = 'MALE',
  FEMALE      = 'FEMALE',
  UNSPECIFIED = 'UNSPECIFIED',
}

export enum UnitSystem {
  METRIC   = 'METRIC',
  IMPERIAL = 'IMPERIAL',
}

export enum GoalPace {
  STEADY   = 'STEADY',
  BALANCED = 'BALANCED',
  FAST     = 'FAST',
}

export enum FitnessDirection {
  LOSS     = 'LOSS',
  GAIN     = 'GAIN',
  MAINTAIN = 'MAINTAIN',
}

export enum PaceUnavailableReason {
  UNDER_18           = 'UNDER_18',
  HEALTH_CAUTION     = 'HEALTH_CAUTION',
  SAFE_LIMIT_REACHED = 'SAFE_LIMIT_REACHED',
}

export enum BadgeCategory {
  CONSISTENCY = 'CONSISTENCY',
  LOYALTY     = 'LOYALTY',
  STRENGTH    = 'STRENGTH',
}

export enum BadgeTier {
  GOLD   = 'GOLD',
  SILVER = 'SILVER',
  BRONZE = 'BRONZE',
}
