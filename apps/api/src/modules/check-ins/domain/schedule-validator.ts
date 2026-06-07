export interface GymScheduleEntry {
  dayOfWeek: number;
  isClosed: boolean;
  openTime: Date | null;
  closeTime: Date | null;
}

export interface GymScheduleContext {
  is247: boolean;
  schedules: GymScheduleEntry[];
}

/**
 * Returns true when a check-in at `now` falls outside the gym's scheduled hours.
 *
 * Rules:
 * - 24/7 gyms are never out of hours
 * - If the gym has no schedule for that day, or the day is marked closed → out of hours
 * - If the current time in the gym's timezone is outside [openTime, closeTime) → out of hours
 * - Does NOT block the check-in — caller is responsible for setting is_out_of_hours
 */
export function isOutOfHours(
  gym: GymScheduleContext,
  now: Date,
  timezone: string,
): boolean {
  if (gym.is247) return false;

  const { dayOfWeek, minuteOfDay } = getLocalTime(now, timezone);
  const schedule = gym.schedules.find((s) => s.dayOfWeek === dayOfWeek);

  if (!schedule || schedule.isClosed) return true;
  if (!schedule.openTime || !schedule.closeTime) return true;

  const openMinutes = parseTimeToMinutes(schedule.openTime);
  const closeMinutes = parseTimeToMinutes(schedule.closeTime);

  return minuteOfDay < openMinutes || minuteOfDay >= closeMinutes;
}

function getLocalTime(now: Date, timezone: string): { dayOfWeek: number; minuteOfDay: number } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now);

  const weekday = parts.find((p) => p.type === 'weekday')?.value ?? 'Sun';
  const hour = parseInt(parts.find((p) => p.type === 'hour')?.value ?? '0', 10);
  const minute = parseInt(parts.find((p) => p.type === 'minute')?.value ?? '0', 10);

  const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const dayOfWeek = WEEKDAYS.indexOf(weekday);

  return {
    dayOfWeek: dayOfWeek === -1 ? 0 : dayOfWeek,
    minuteOfDay: hour * 60 + minute,
  };
}

function parseTimeToMinutes(time: Date): number {
  return time.getUTCHours() * 60 + time.getUTCMinutes();
}
