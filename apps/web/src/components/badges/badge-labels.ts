import { BadgeCategory, BadgeTier } from '@gym-saas/contracts';

export const CATEGORY_ORDER = [BadgeCategory.CONSISTENCY, BadgeCategory.LOYALTY, BadgeCategory.STRENGTH];

export const CATEGORY_LABEL: Record<BadgeCategory, string> = {
  [BadgeCategory.CONSISTENCY]: 'Consistency',
  [BadgeCategory.LOYALTY]: 'Loyalty',
  [BadgeCategory.STRENGTH]: 'Strength',
};

export const CATEGORY_HINT: Record<BadgeCategory, string> = {
  [BadgeCategory.CONSISTENCY]: 'Showing up: streaks, sessions, habits',
  [BadgeCategory.LOYALTY]: 'Sticking with the gym',
  [BadgeCategory.STRENGTH]: 'What they lift',
};

export const TIER_LABEL: Record<BadgeTier, string> = {
  [BadgeTier.BRONZE]: 'Bronze',
  [BadgeTier.SILVER]: 'Silver',
  [BadgeTier.GOLD]: 'Gold',
};

export const LADDER_TIERS = [BadgeTier.BRONZE, BadgeTier.SILVER, BadgeTier.GOLD];

