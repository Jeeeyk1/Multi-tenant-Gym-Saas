import { AiFeature, StaffRole } from '../../../common/enums';
import type { AuthenticatedUser } from '../../../common/types/auth.types';
import { localDate } from '../../../common/time/local-date';

/** ai_usage_log.feature_key of the staff AI assistant. */
export const ASSISTANT_FEATURE_KEY = 'ai_insights';

/** Every member-facing AI feature shares the gym's member AI pool. */
export const MEMBER_FEATURE_KEYS: readonly string[] = Object.values(AiFeature);

/** Assistant questions per person per day (gym timezone), on top of the monthly pool and the burst limit. */
export const ASSISTANT_DAILY_LIMIT = { owner: 40, staff: 15 } as const;

export function assistantDailyLimit(caller: AuthenticatedUser): number {
  const isOwner = caller.type === 'org' || caller.roles.includes(StaffRole.OWNER);
  return isOwner ? ASSISTANT_DAILY_LIMIT.owner : ASSISTANT_DAILY_LIMIT.staff;
}

export interface PoolStatus {
  usedUsdMicros: number;
  capUsdMicros: number;
  /** 0–100, rounded down. */
  usedPct: number;
  /** When the pool resets: the start of next month in the gym's timezone. */
  resetsAt: Date;
  /** The reset day as a calendar date (YYYY-MM-DD) in the gym's timezone, for display. */
  resetsOn: string;
}

export function poolStatus(usedUsdMicros: number, capUsdMicros: number, resetsAt: Date, timeZone: string): PoolStatus {
  const usedPct = capUsdMicros > 0 ? Math.min(100, Math.floor((usedUsdMicros / capUsdMicros) * 100)) : 100;
  return { usedUsdMicros, capUsdMicros, usedPct, resetsAt, resetsOn: localDate(resetsAt, timeZone) };
}

export function isPoolExhausted(status: PoolStatus): boolean {
  return status.usedUsdMicros >= status.capUsdMicros;
}
