import { BadgeCriteriaType } from '../../../common/enums';

const DAY_MS = 86_400_000;
// A membership month is 30 active days: plans are sold as 30-day months and 365-day
// years, so a monthly member reaches "1 month" and a yearly member "12 months" on time.
const DAYS_PER_MONTH = 30;
const EARLY_BIRD_BEFORE_HOUR = 7;
const NIGHT_OWL_FROM_HOUR = 20;

/** Everything the auto-awarded badges are judged on, for one member. */
export interface BadgeStats {
  sessionCount: number;
  workoutTypeCount: number;
  checkinStreak: number;
  earlyBirdCount: number;
  nightOwlCount: number;
  weeklyConsistent: number;
  activeMonths: number;
  /** 1 = first member to join the gym. */
  joinPosition: number;
}

export interface Progress {
  current: number;
  target: number;
}

/** YYYY-MM-DD and hour of an instant in a timezone. */
function localParts(instant: Date, timeZone: string): { date: string; hour: number } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(instant);
  const get = (type: string) => parts.find((p) => p.type === type)!.value;
  return { date: `${get('year')}-${get('month')}-${get('day')}`, hour: Number(get('hour')) };
}

function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(`${a}T00:00:00Z`) - Date.parse(`${b}T00:00:00Z`)) / DAY_MS);
}

/** Consecutive days with a check-in, ending today or yesterday (gym's local days). */
export function computeCheckinStreak(checkins: Date[], timeZone: string, now: Date): number {
  const days = [...new Set(checkins.map((d) => localParts(d, timeZone).date))].sort().reverse();
  if (days.length === 0) return 0;
  const today = localParts(now, timeZone).date;
  if (daysBetween(today, days[0]) > 1) return 0;

  let streak = 1;
  for (let i = 1; i < days.length && daysBetween(days[i - 1], days[i]) === 1; i++) streak++;
  return streak;
}

export function countCheckinsByHour(checkins: Date[], timeZone: string): { earlyBird: number; nightOwl: number } {
  let earlyBird = 0;
  let nightOwl = 0;
  for (const c of checkins) {
    const { hour } = localParts(c, timeZone);
    if (hour < EARLY_BIRD_BEFORE_HOUR) earlyBird++;
    if (hour >= NIGHT_OWL_FROM_HOUR) nightOwl++;
  }
  return { earlyBird, nightOwl };
}

/** Monday of the ISO week a local date falls in, as YYYY-MM-DD. */
function weekStart(localDate: string): string {
  const d = new Date(`${localDate}T00:00:00Z`);
  const offset = (d.getUTCDay() + 6) % 7;
  return new Date(d.getTime() - offset * DAY_MS).toISOString().slice(0, 10);
}

/** Consecutive weeks (Monday–Sunday) with at least one session, ending in the latest one. */
export function computeWeeklyConsistent(sessions: Date[], timeZone: string): number {
  const weeks = [...new Set(sessions.map((d) => weekStart(localParts(d, timeZone).date)))].sort().reverse();
  if (weeks.length === 0) return 0;
  let run = 1;
  for (let i = 1; i < weeks.length && daysBetween(weeks[i - 1], weeks[i]) === 7; i++) run++;
  return run;
}

export interface MembershipHistory {
  joinedAt: Date;
  /** The member's current expiry date. */
  expiryDate: Date;
  renewals: { previousExpiry: Date; newExpiry: Date; renewedAt: Date }[];
}

/**
 * Days with an active membership up to `now`. The first period runs from joining to
 * the first expiry; each renewal covers from when it took effect (the old expiry, or
 * the renewal date if the membership had already lapsed) to its new expiry. Expiry
 * dates are inclusive (members can check in on that day). Prepaid future days and gaps
 * between a lapse and a renewal don't count.
 */
export function activeMembershipDays(history: MembershipHistory, now: Date): number {
  const sorted = [...history.renewals].sort((a, b) => a.renewedAt.getTime() - b.renewedAt.getTime());
  const firstExpiry = sorted[0]?.previousExpiry ?? history.expiryDate;
  const endOf = (expiry: Date) => expiry.getTime() + DAY_MS;
  const periods: [number, number][] = [[history.joinedAt.getTime(), endOf(firstExpiry)]];
  for (const r of sorted) {
    periods.push([Math.max(endOf(r.previousExpiry), r.renewedAt.getTime()), endOf(r.newExpiry)]);
  }

  const end = now.getTime();
  let total = 0;
  let coveredUntil = -Infinity;
  for (const [from, to] of periods.sort((a, b) => a[0] - b[0])) {
    const start = Math.max(from, coveredUntil);
    const stop = Math.min(to, end);
    if (stop > start) total += stop - start;
    coveredUntil = Math.max(coveredUntil, to);
  }
  return Math.floor(total / DAY_MS);
}

export function daysToMonths(days: number): number {
  return Math.floor(days / DAYS_PER_MONTH);
}

/** Progress toward a catalog badge, or null when it has nothing to count (manual badges). */
export function catalogProgress(criteria: string, target: number | null, stats: BadgeStats): Progress | null {
  const goal = target ?? 0;
  const current: Partial<Record<BadgeCriteriaType, number>> = {
    [BadgeCriteriaType.SESSION_COUNT]: stats.sessionCount,
    [BadgeCriteriaType.CHECKIN_STREAK]: stats.checkinStreak,
    [BadgeCriteriaType.WORKOUT_VARIETY]: stats.workoutTypeCount,
    [BadgeCriteriaType.EARLY_BIRD]: stats.earlyBirdCount,
    [BadgeCriteriaType.NIGHT_OWL]: stats.nightOwlCount,
    [BadgeCriteriaType.WEEKLY_CONSISTENT]: stats.weeklyConsistent,
    [BadgeCriteriaType.MEMBERSHIP_MONTHS]: stats.activeMonths,
  };
  if (criteria === BadgeCriteriaType.FOUNDING_MEMBER) {
    // Earned by joining early; there is nothing to make progress on.
    return null;
  }
  const value = current[criteria as BadgeCriteriaType];
  return value === undefined ? null : { current: Math.min(value, goal), target: goal };
}

export function isCatalogBadgeEarned(criteria: string, target: number | null, stats: BadgeStats): boolean {
  if (criteria === BadgeCriteriaType.FOUNDING_MEMBER) return stats.joinPosition <= (target ?? 0);
  const progress = catalogProgress(criteria, target, stats);
  return progress !== null && progress.current >= progress.target;
}
