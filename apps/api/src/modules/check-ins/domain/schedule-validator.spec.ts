import { isOutOfHours } from './schedule-validator';
import type { GymScheduleContext } from './schedule-validator';

const TIMEZONE = 'Asia/Manila'; // UTC+8

function t(time: string): Date {
  const [h, m] = time.split(':').map(Number);
  const d = new Date(0);
  d.setUTCHours(h, m ?? 0, 0, 0);
  return d;
}

// Helper: build a Date for a specific weekday + time in Manila time
// dayOfWeek: 0=Sun, ... 6=Sat
function manilaTime(weekdayStr: string, hour: number, minute: number): Date {
  // Build a date string that resolves to the right local time in Manila
  // Use a known Monday (2026-04-20) as anchor and offset from there
  const ANCHOR_MONDAY = '2026-04-20'; // Monday
  const DAYS_FROM_MONDAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const monIdx = 1; // Monday=1
  const targetIdx = DAYS_FROM_MONDAY.indexOf(weekdayStr);
  const diff = targetIdx - monIdx;
  const d = new Date(ANCHOR_MONDAY);
  d.setDate(d.getDate() + diff);
  // Set to Manila time: Manila is UTC+8, so subtract 8h to get UTC equivalent
  return new Date(
    Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), hour - 8, minute, 0),
  );
}

const openSchedules: GymScheduleContext = {
  is247: false,
  schedules: [
    { dayOfWeek: 0, isClosed: true, openTime: null, closeTime: null },   // Sun closed
    { dayOfWeek: 1, isClosed: false, openTime: t('06:00'), closeTime: t('22:00') },
    { dayOfWeek: 2, isClosed: false, openTime: t('06:00'), closeTime: t('22:00') },
    { dayOfWeek: 3, isClosed: false, openTime: t('06:00'), closeTime: t('22:00') },
    { dayOfWeek: 4, isClosed: false, openTime: t('06:00'), closeTime: t('22:00') },
    { dayOfWeek: 5, isClosed: false, openTime: t('06:00'), closeTime: t('22:00') },
    { dayOfWeek: 6, isClosed: false, openTime: t('08:00'), closeTime: t('20:00') },
  ],
};

describe('isOutOfHours', () => {
  it('returns false for 24/7 gym regardless of schedule', () => {
    const gym247: GymScheduleContext = { is247: true, schedules: [] };
    const anyTime = manilaTime('Mon', 3, 0); // 3am
    expect(isOutOfHours(gym247, anyTime, TIMEZONE)).toBe(false);
  });

  it('returns false when check-in is within schedule hours', () => {
    const noon = manilaTime('Mon', 12, 0);
    expect(isOutOfHours(openSchedules, noon, TIMEZONE)).toBe(false);
  });

  it('returns true when check-in is before opening time', () => {
    const earlyMorning = manilaTime('Mon', 5, 59);
    expect(isOutOfHours(openSchedules, earlyMorning, TIMEZONE)).toBe(true);
  });

  it('returns true when check-in is at or after closing time', () => {
    const closing = manilaTime('Mon', 22, 0);
    expect(isOutOfHours(openSchedules, closing, TIMEZONE)).toBe(true);
  });

  it('returns true when the gym is closed that day', () => {
    const sunday = manilaTime('Sun', 12, 0);
    expect(isOutOfHours(openSchedules, sunday, TIMEZONE)).toBe(true);
  });

  it('returns true when no schedule entry exists for that day', () => {
    const noSchedule: GymScheduleContext = { is247: false, schedules: [] };
    const monday = manilaTime('Mon', 10, 0);
    expect(isOutOfHours(noSchedule, monday, TIMEZONE)).toBe(true);
  });

  it('returns false at exactly open time', () => {
    const openTime = manilaTime('Mon', 6, 0);
    expect(isOutOfHours(openSchedules, openTime, TIMEZONE)).toBe(false);
  });

  it('respects different schedules per day (Sat shorter hours)', () => {
    const satEarly = manilaTime('Sat', 7, 59); // Before 08:00
    const satMid = manilaTime('Sat', 10, 0);   // Within 08:00–20:00
    expect(isOutOfHours(openSchedules, satEarly, TIMEZONE)).toBe(true);
    expect(isOutOfHours(openSchedules, satMid, TIMEZONE)).toBe(false);
  });
});
