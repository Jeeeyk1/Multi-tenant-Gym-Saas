import { localDate } from './local-date';

describe('localDate', () => {
  it('returns the date in the given timezone, not UTC', () => {
    // 17:30 UTC on Dec 31 is already Jan 1 in Manila (UTC+8).
    const instant = new Date('2026-12-31T17:30:00Z');
    expect(localDate(instant, 'Asia/Manila')).toBe('2027-01-01');
    expect(localDate(instant, 'UTC')).toBe('2026-12-31');
  });
});
