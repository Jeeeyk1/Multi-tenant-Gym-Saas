import type { CheckIn } from '../types';

/** Consecutive days with a check-in, counting back from today (or from yesterday if not in yet today). Shared by Home and Check In. */
export function computeStreak(checkIns: CheckIn[]): { streak: number; lastCheckInToday: boolean } {
  if (!checkIns.length) return { streak: 0, lastCheckInToday: false };
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dates = checkIns
    .map((c) => { const d = new Date(c.checkedInAt); d.setHours(0, 0, 0, 0); return d.getTime(); })
    .filter((v, i, a) => a.indexOf(v) === i)
    .sort((a, b) => b - a);
  const lastCheckInToday = dates[0] === today.getTime();
  let streak = lastCheckInToday ? 1 : 0;
  let prev = today.getTime();
  for (let i = lastCheckInToday ? 1 : 0; i < dates.length; i++) {
    if (prev - dates[i] === 86400000) { streak++; prev = dates[i]; } else break;
  }
  return { streak, lastCheckInToday };
}
