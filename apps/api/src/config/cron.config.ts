/**
 * Cron expressions for scheduled jobs.
 * Change schedule here — not in the job class.
 */
export const CRON_SCHEDULE = {
  MEMBERSHIP_EXPIRY: '0 1 * * *',       // Daily at 01:00 UTC
  AUTO_SUSPEND: '0 2 * * *',             // Daily at 02:00 UTC
  AUTO_CHECKOUT: '*/15 * * * *',         // Every 15 minutes
  ANNOUNCEMENT_PUBLISHER: '*/5 * * * *', // Every 5 minutes
  LEADERBOARD_CYCLE: '0 3 * * *',        // Daily at 03:00 UTC — closes cycles older than 14 days
} as const;

export const CRON_LOCK_TTL = {
  MEMBERSHIP_EXPIRY: 300,      // 5 minutes
  AUTO_SUSPEND: 300,            // 5 minutes
  AUTO_CHECKOUT: 600,           // 10 minutes
  ANNOUNCEMENT_PUBLISHER: 120, // 2 minutes
  LEADERBOARD_CYCLE: 300,      // 5 minutes
} as const;

export const BATCH_SIZE = 100;
