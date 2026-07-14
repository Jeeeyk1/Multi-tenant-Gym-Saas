/**
 * Only the members' PUBLISHED list is cached (the hot path — every member home
 * screen). Manager views use variable filters and are low-traffic, so they stay
 * uncached. The 60s TTL also covers the announcement-publisher cron flipping
 * scheduled→published without a manual write (self-heals within the window).
 */
export const ANNOUNCEMENTS_TTL_SECONDS = 60;

export function publishedAnnouncementsCacheKey(gymId: string): string {
  return `announcements:published:${gymId}`;
}
