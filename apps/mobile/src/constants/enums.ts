// Mirror of apps/api/src/common/enums — keep values in sync with backend

export enum FitnessGoal {
  LOSE_WEIGHT  = 'LOSE_WEIGHT',
  BUILD_MUSCLE = 'BUILD_MUSCLE',
  GET_FIT      = 'GET_FIT',
  STAY_HEALTHY = 'STAY_HEALTHY',
  OTHER        = 'OTHER',
}

export enum ActivityLevel {
  BEGINNER            = 'BEGINNER',
  OCCASIONALLY_ACTIVE = 'OCCASIONALLY_ACTIVE',
  PRETTY_ACTIVE       = 'PRETTY_ACTIVE',
  VERY_ACTIVE         = 'VERY_ACTIVE',
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
