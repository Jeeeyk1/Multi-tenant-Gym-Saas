/** Shared by the read use case and the write use cases so the key never drifts. */
export const LEADERBOARD_TTL_SECONDS = 60;

export function leaderboardCacheKey(gymId: string): string {
  return `leaderboard:board:${gymId}`;
}
