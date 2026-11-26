/** Local calendar-day key, e.g. "2026-11-27". Works across daylight-saving changes, unlike 24-hour maths. */
function dayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** True when the timestamp falls on today's local date. */
export function isToday(iso: string, now: Date = new Date()): boolean {
  return dayKey(new Date(iso)) === dayKey(now);
}

/**
 * Consecutive local days with at least one entry, counting back from today (or from yesterday
 * when there is nothing yet today). Used for the workout streak on Train; the check-in streak
 * comes from the API so it matches the badges.
 */
export function countDayStreak(timestamps: string[], now: Date = new Date()): number {
  const days = new Set(timestamps.map((t) => dayKey(new Date(t))));
  const cursor = new Date(now);
  if (!days.has(dayKey(cursor))) cursor.setDate(cursor.getDate() - 1);
  let streak = 0;
  while (days.has(dayKey(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}
