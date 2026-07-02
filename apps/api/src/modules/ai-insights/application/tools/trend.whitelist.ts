import { METRIC_ENTITIES, type MetricEntity, resolveDateRange } from './metric.whitelist';

export type TrendGranularity = 'day' | 'week' | 'month';

export interface TrendQuery {
  entity: MetricEntity;
  granularity: TrendGranularity;
  /** Only valid for renewals — use 'amount' to sum revenue. Omit for count. */
  field?: 'amount';
  from: Date;
  to: Date;
}

const GRANULARITIES: TrendGranularity[] = ['day', 'week', 'month'];
const DEFAULT_WINDOWS: Record<TrendGranularity, number> = { day: 30, week: 84, month: 365 };

export function validateTrendQuery(raw: Record<string, unknown>): TrendQuery {
  const entity = raw.entity as MetricEntity;
  if (!Object.prototype.hasOwnProperty.call(METRIC_ENTITIES, entity)) {
    throw new Error(`Unknown entity "${String(raw.entity)}". Allowed: ${Object.keys(METRIC_ENTITIES).join(', ')}.`);
  }

  const granularity = raw.granularity as TrendGranularity;
  if (!GRANULARITIES.includes(granularity)) {
    throw new Error(`Unknown granularity "${String(raw.granularity)}". Allowed: ${GRANULARITIES.join(', ')}.`);
  }

  const field = raw.field;
  if (field != null && field !== 'amount') {
    throw new Error(`Only "amount" is supported as a trend field.`);
  }
  if (field === 'amount' && entity !== 'renewals') {
    throw new Error(`The "amount" field is only available on the "renewals" entity.`);
  }

  const resolved = resolveDateRange(raw.date_range as Record<string, unknown> | undefined);
  const now = new Date();
  const from = resolved?.gte ?? daysAgo(DEFAULT_WINDOWS[granularity], now);
  const to = resolved?.lte ?? now;

  return { entity, granularity, field: field as TrendQuery['field'], from, to };
}

function daysAgo(n: number, from: Date): Date {
  const d = new Date(from);
  d.setDate(d.getDate() - n);
  return d;
}
