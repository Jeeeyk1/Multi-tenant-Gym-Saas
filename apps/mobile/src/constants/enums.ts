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

export enum BadgeRarity {
  EPIC      = 'EPIC',
  LEGENDARY = 'LEGENDARY',
}

/** Permission keys the app checks to show or hide tools. The API enforces them; this only shapes the UI. */
export enum Permission {
  MEMBERS_VIEW         = 'members.view',
  MEMBERS_DETAILS      = 'members.details',
  MEMBERS_CREATE       = 'members.create',
  MEMBERS_RENEW        = 'members.renew',
  MEMBERS_SUSPEND      = 'members.suspend',
  CHECKINS_VIEW        = 'checkins.view',
  CHECKINS_MANAGE      = 'checkins.manage',
  ANNOUNCEMENTS_MANAGE = 'announcements.manage',
  CHAT_MANAGE          = 'chat.manage',
  PLANS_VIEW           = 'plans.view',
  LEADERBOARD_REVIEW   = 'leaderboard.review',
  LEADERBOARD_MANAGE   = 'leaderboard.manage',
  BADGES_AWARD         = 'badges.award',
  REPORTS_VIEW         = 'reports.view',
  INSIGHTS_QUERY       = 'insights.query',
}

/** Not a stored role: in the token of anyone with a membership at the gym. */
export const MEMBER_ROLE = 'MEMBER';

export enum MemberStatus {
  ACTIVE    = 'ACTIVE',
  INACTIVE  = 'INACTIVE',
  EXPIRED   = 'EXPIRED',
  SUSPENDED = 'SUSPENDED',
  DELETED   = 'DELETED',
}

// Error codes the check-in endpoint returns (apps/api/src/modules/check-ins/application/use-cases/check-in.use-case.ts)
export enum CheckInErrorCode {
  ALREADY_CHECKED_IN = 'ALREADY_CHECKED_IN',
  MEMBERSHIP_EXPIRED = 'MEMBERSHIP_EXPIRED',
  MEMBER_NOT_ACTIVE  = 'MEMBER_NOT_ACTIVE',
  MEMBER_NOT_FOUND   = 'MEMBER_NOT_FOUND',
}
