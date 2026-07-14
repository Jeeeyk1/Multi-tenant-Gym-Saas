/** Shared by list (read) and create/update (writes) so the key never drifts. */
export const PLANS_TTL_SECONDS = 60;

export function plansCacheKey(gymId: string): string {
  return `plans:${gymId}`;
}
