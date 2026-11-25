import type { EquippedBadge, EquippedBadgeRow } from '@/types/api';

/** Equipped badges keyed by user id, as a plain object so it can be passed to client components. */
export function equippedByUser(rows: EquippedBadgeRow[]): Record<string, EquippedBadge[]> {
  return Object.fromEntries(rows.map((r) => [r.userId, r.badges]));
}
