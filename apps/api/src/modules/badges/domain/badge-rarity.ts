import { BadgeRarity } from '../../../common/enums';

/**
 * Rarest first. A tier needs a minimum gym size, otherwise every badge in a small gym would
 * look rare (one holder in four members is 25%, but one in two is "rare" by share alone).
 */
const RARITY_RULES = [
  { rarity: BadgeRarity.LEGENDARY, maxSharePct: 5, minActiveMembers: 20 },
  { rarity: BadgeRarity.EPIC, maxSharePct: 15, minActiveMembers: 10 },
] as const;

/** Share of the gym's active members holding a badge, 0–100 (null when the gym has none). */
export function badgeSharePct(holders: number, activeMembers: number): number | null {
  return activeMembers > 0 ? Math.round((holders / activeMembers) * 100) : null;
}

export function badgeRarity(holders: number, activeMembers: number): BadgeRarity | null {
  if (activeMembers === 0) return null;
  const sharePct = (holders / activeMembers) * 100;
  const rule = RARITY_RULES.find((r) => activeMembers >= r.minActiveMembers && sharePct <= r.maxSharePct);
  return rule?.rarity ?? null;
}

/** The stable id of a badge definition, shared by the collection, rarity counts and equipped badges. */
export function badgeKey(ids: { badgeCatalogId: string | null; milestoneBadgeId: string | null; customBadgeId: string | null }): string {
  if (ids.badgeCatalogId) return `catalog:${ids.badgeCatalogId}`;
  if (ids.milestoneBadgeId) return `milestone:${ids.milestoneBadgeId}`;
  return `custom:${ids.customBadgeId}`;
}
