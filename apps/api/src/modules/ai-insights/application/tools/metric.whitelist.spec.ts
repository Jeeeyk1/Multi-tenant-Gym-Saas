import { validateMetricQuery } from './metric.whitelist';

describe('validateMetricQuery', () => {
  it('rejects an entity outside the whitelist', () => {
    expect(() => validateMetricQuery({ entity: 'invoices', metric: 'count' })).toThrow(/Unknown entity/);
  });

  it('rejects a group_by dimension outside the whitelist', () => {
    expect(() => validateMetricQuery({ entity: 'members', metric: 'count', group_by: 'email' })).toThrow(/Cannot group/);
  });

  it('rejects a filter field outside the whitelist', () => {
    expect(() =>
      validateMetricQuery({ entity: 'checkins', metric: 'count', filters: [{ field: 'memberId', value: 'x' }] }),
    ).toThrow(/Cannot filter/);
  });

  it('requires a whitelisted numeric field for sum/avg', () => {
    expect(() => validateMetricQuery({ entity: 'renewals', metric: 'sum' })).toThrow(/requires a numeric field/);
    expect(() => validateMetricQuery({ entity: 'renewals', metric: 'sum', field: 'secret_column' })).toThrow(
      /requires a numeric field/,
    );
  });

  it('resolves aliases to real columns and never exposes raw column names', () => {
    const query = validateMetricQuery({
      entity: 'renewals',
      metric: 'sum',
      field: 'amount',
      group_by: 'payment_method',
      filters: [{ field: 'payment_method', value: 'CASH' }],
      date_range: { preset: 'this_month' },
    });

    expect(query.entity).toBe('renewals');
    expect(query.field).toBe('amountPaid');
    expect(query.groupBy).toBe('paymentMethod');
    expect(query.where).toEqual({ paymentMethod: 'CASH' });
    expect(query.range?.gte).toBeInstanceOf(Date);
  });

  it('allows a count without a field', () => {
    const query = validateMetricQuery({ entity: 'members', metric: 'count', filters: [{ field: 'status', value: 'ACTIVE' }] });
    expect(query.aggregate).toBe('count');
    expect(query.where).toEqual({ status: 'ACTIVE' });
  });
});
