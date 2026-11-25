import { BadgeCategory, BadgeTier } from '../../constants/enums';
import { BADGE_COLORS } from '../../constants/theme';
import type { MemberBadge } from '../../types';

export const CATEGORY_LABEL: Record<BadgeCategory, string> = {
  [BadgeCategory.CONSISTENCY]: 'Consistency',
  [BadgeCategory.LOYALTY]: 'Loyalty',
  [BadgeCategory.STRENGTH]: 'Strength',
};

export const CATEGORY_HINT: Record<BadgeCategory, string> = {
  [BadgeCategory.CONSISTENCY]: 'Showing up: streaks, sessions, habits',
  [BadgeCategory.LOYALTY]: 'Sticking with your gym',
  [BadgeCategory.STRENGTH]: 'What you lift',
};

export const CATEGORY_ORDER: BadgeCategory[] = [BadgeCategory.CONSISTENCY, BadgeCategory.LOYALTY, BadgeCategory.STRENGTH];

export const TIER_LABEL: Record<BadgeTier, string> = {
  [BadgeTier.GOLD]: 'Gold',
  [BadgeTier.SILVER]: 'Silver',
  [BadgeTier.BRONZE]: 'Bronze',
};

/** The definition fields of a member's badge, whichever kind it is. */
export function memberBadgeView(b: MemberBadge) {
  return {
    category: b.category,
    name: b.badgeCatalog?.name ?? b.customBadge?.name ?? b.milestoneBadge?.badgeName ?? 'Badge',
    description: b.badgeCatalog?.description ?? b.customBadge?.description ?? b.milestoneBadge?.description ?? null,
    icon: b.badgeCatalog?.icon ?? b.customBadge?.icon ?? b.milestoneBadge?.icon ?? 'ribbon',
    color: b.badgeCatalog?.color ?? b.customBadge?.color ?? b.milestoneBadge?.color ?? BADGE_COLORS.FALLBACK,
    tier: b.badgeRank ?? b.milestoneBadge?.tier ?? null,
  };
}
