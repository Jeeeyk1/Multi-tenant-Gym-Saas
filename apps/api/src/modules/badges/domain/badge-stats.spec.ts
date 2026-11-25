import { BadgeCriteriaType } from '../../../common/enums';
import {
  activeMembershipDays,
  catalogProgress,
  computeCheckinStreak,
  computeWeeklyConsistent,
  countCheckinsByHour,
  daysToMonths,
  isCatalogBadgeEarned,
  type BadgeStats,
} from './badge-stats';

const TZ = 'Asia/Manila'; // UTC+8, no DST
const at = (iso: string) => new Date(iso);

describe('computeCheckinStreak', () => {
  const now = at('2026-11-25T04:00:00Z'); // Nov 25, noon in Manila

  it('counts consecutive local days ending today', () => {
    const checkins = ['2026-11-23T01:00:00Z', '2026-11-24T01:00:00Z', '2026-11-25T01:00:00Z'].map(at);
    expect(computeCheckinStreak(checkins, TZ, now)).toBe(3);
  });

  it('still counts when the last check-in was yesterday', () => {
    expect(computeCheckinStreak([at('2026-11-24T01:00:00Z')], TZ, now)).toBe(1);
  });

  it('breaks after a missed day', () => {
    expect(computeCheckinStreak([at('2026-11-22T01:00:00Z')], TZ, now)).toBe(0);
  });

  it('uses the gym-local day, not UTC', () => {
    // 17:30 UTC on Nov 24 is 01:30 on Nov 25 in Manila: these are two different local days.
    const checkins = [at('2026-11-24T01:00:00Z'), at('2026-11-24T17:30:00Z')];
    expect(computeCheckinStreak(checkins, TZ, now)).toBe(2);
  });
});

describe('countCheckinsByHour', () => {
  it('judges early bird and night owl on gym-local hours', () => {
    // 22:30 UTC = 06:30 Manila (early bird); 12:30 UTC = 20:30 Manila (night owl).
    expect(countCheckinsByHour([at('2026-11-24T22:30:00Z'), at('2026-11-24T12:30:00Z')], TZ)).toEqual({
      earlyBird: 1,
      nightOwl: 1,
    });
  });
});

describe('computeWeeklyConsistent', () => {
  it('counts consecutive Monday–Sunday weeks with a session', () => {
    const sessions = ['2026-11-03T02:00:00Z', '2026-11-12T02:00:00Z', '2026-11-20T02:00:00Z'].map(at);
    expect(computeWeeklyConsistent(sessions, TZ)).toBe(3);
  });

  it('stops at a week without sessions', () => {
    const sessions = ['2026-11-03T02:00:00Z', '2026-11-20T02:00:00Z'].map(at);
    expect(computeWeeklyConsistent(sessions, TZ)).toBe(1);
  });
});

describe('activeMembershipDays', () => {
  const now = at('2027-06-01T00:00:00Z');

  it('treats the expiry date as a full active day', () => {
    // Joined Oct 1 on a 30-day plan: expiry Oct 31 is still an active day.
    const days = activeMembershipDays({ joinedAt: at('2026-10-01T02:00:00Z'), expiryDate: at('2026-10-31T00:00:00Z'), renewals: [] }, now);
    expect(daysToMonths(days)).toBe(1);
  });

  it('gives a 365-day member their 12 months', () => {
    const days = activeMembershipDays({ joinedAt: at('2025-06-01T02:00:00Z'), expiryDate: at('2026-06-01T00:00:00Z'), renewals: [] }, now);
    expect(daysToMonths(days)).toBe(12);
  });

  it('adds back-to-back renewals without double counting', () => {
    const days = activeMembershipDays(
      {
        joinedAt: at('2026-10-01T00:00:00Z'),
        expiryDate: at('2026-11-30T00:00:00Z'),
        renewals: [{ previousExpiry: at('2026-10-31T00:00:00Z'), newExpiry: at('2026-11-30T00:00:00Z'), renewedAt: at('2026-10-29T00:00:00Z') }],
      },
      now,
    );
    expect(days).toBe(61);
    expect(daysToMonths(days)).toBe(2);
  });

  it('skips the gap when a lapsed membership is renewed late', () => {
    const days = activeMembershipDays(
      {
        joinedAt: at('2026-09-01T00:00:00Z'),
        expiryDate: at('2026-12-14T00:00:00Z'),
        // Expired Sep 30, renewed Nov 15 for 30 days: Oct 1 – Nov 14 doesn't count.
        renewals: [{ previousExpiry: at('2026-09-30T00:00:00Z'), newExpiry: at('2026-12-14T00:00:00Z'), renewedAt: at('2026-11-15T00:00:00Z') }],
      },
      now,
    );
    expect(days).toBe(30 + 30);
  });

  it("doesn't count prepaid days in the future", () => {
    const days = activeMembershipDays({ joinedAt: at('2027-05-01T00:00:00Z'), expiryDate: at('2028-05-01T00:00:00Z'), renewals: [] }, now);
    expect(days).toBe(31);
  });

  it('converts days to whole 30-day months', () => {
    expect(daysToMonths(29)).toBe(0);
    expect(daysToMonths(31)).toBe(1);
    expect(daysToMonths(366)).toBe(12);
  });
});

describe('catalog badge progress', () => {
  const stats: BadgeStats = {
    sessionCount: 4,
    workoutTypeCount: 2,
    checkinStreak: 7,
    earlyBirdCount: 0,
    nightOwlCount: 12,
    weeklyConsistent: 3,
    activeMonths: 5,
    joinPosition: 12,
  };

  it('reports progress toward a target, capped at the target', () => {
    expect(catalogProgress(BadgeCriteriaType.SESSION_COUNT, 10, stats)).toEqual({ current: 4, target: 10 });
    expect(catalogProgress(BadgeCriteriaType.NIGHT_OWL, 10, stats)).toEqual({ current: 10, target: 10 });
    expect(catalogProgress(BadgeCriteriaType.MEMBERSHIP_MONTHS, 6, stats)).toEqual({ current: 5, target: 6 });
  });

  it('has no progress for founding member or manual badges', () => {
    expect(catalogProgress(BadgeCriteriaType.FOUNDING_MEMBER, 30, stats)).toBeNull();
    expect(catalogProgress(BadgeCriteriaType.MANUAL, null, stats)).toBeNull();
  });

  it('decides when a badge is earned', () => {
    expect(isCatalogBadgeEarned(BadgeCriteriaType.CHECKIN_STREAK, 7, stats)).toBe(true);
    expect(isCatalogBadgeEarned(BadgeCriteriaType.CHECKIN_STREAK, 14, stats)).toBe(false);
    expect(isCatalogBadgeEarned(BadgeCriteriaType.FOUNDING_MEMBER, 30, stats)).toBe(true);
    expect(isCatalogBadgeEarned(BadgeCriteriaType.FOUNDING_MEMBER, 10, stats)).toBe(false);
    expect(isCatalogBadgeEarned(BadgeCriteriaType.MANUAL, null, stats)).toBe(false);
  });
});
