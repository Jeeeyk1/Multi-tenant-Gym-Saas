import { validateTrendQuery } from './trend.whitelist';

describe('validateTrendQuery', () => {
  it('rejects an entity not in the whitelist', () => {
    expect(() => validateTrendQuery({ entity: 'invoices', granularity: 'day' })).toThrow(/Unknown entity/);
  });

  it('rejects an unknown granularity', () => {
    expect(() => validateTrendQuery({ entity: 'checkins', granularity: 'hour' })).toThrow(/Unknown granularity/);
  });

  it('rejects amount field on non-renewals entities', () => {
    expect(() => validateTrendQuery({ entity: 'checkins', granularity: 'day', field: 'amount' })).toThrow(
      /only available on the "renewals"/,
    );
    expect(() => validateTrendQuery({ entity: 'members', granularity: 'month', field: 'amount' })).toThrow(
      /only available on the "renewals"/,
    );
  });

  it('rejects an unknown field', () => {
    expect(() => validateTrendQuery({ entity: 'renewals', granularity: 'week', field: 'secret_col' })).toThrow(
      /Only "amount" is supported/,
    );
  });

  it('builds a valid checkins-by-day query with default range', () => {
    const query = validateTrendQuery({ entity: 'checkins', granularity: 'day' });
    expect(query.entity).toBe('checkins');
    expect(query.granularity).toBe('day');
    expect(query.field).toBeUndefined();
    expect(query.from).toBeInstanceOf(Date);
    expect(query.to).toBeInstanceOf(Date);
    expect(query.to.getTime() - query.from.getTime()).toBeGreaterThan(0);
  });

  it('builds a revenue-by-month query with explicit date_range', () => {
    const query = validateTrendQuery({
      entity: 'renewals',
      granularity: 'month',
      field: 'amount',
      date_range: { from: '2026-01-01', to: '2026-06-30' },
    });
    expect(query.field).toBe('amount');
    expect(query.from.toISOString()).toMatch(/^2026-01-01/);
    expect(query.to.toISOString()).toMatch(/^2026-06-30/);
  });

  it('applies last_n_days date range', () => {
    const query = validateTrendQuery({ entity: 'members', granularity: 'week', date_range: { last_n_days: 7 } });
    const diff = query.to.getTime() - query.from.getTime();
    const days = diff / (1000 * 60 * 60 * 24);
    expect(days).toBeCloseTo(7, 0);
  });
});
