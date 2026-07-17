export const METRIC_ENTITIES = {
  members: {
    label: 'gym members',
    dateField: 'joinedAt',
    numericFields: {},
    dimensions: { status: 'status' },
    filters: { status: 'status' },
    // Stored values are upper-case (see gym_members_status_check). Filter values are
    // normalized to these case-insensitively so a natural-language "active" still matches.
    filterValues: { status: ['ACTIVE', 'EXPIRED', 'SUSPENDED'] },
  },
  checkins: {
    label: 'member check-ins',
    dateField: 'checkedInAt',
    numericFields: {},
    dimensions: { method: 'method' },
    filters: { method: 'method' },
    filterValues: { method: ['MANUAL_STAFF', 'QR_STAFF_SCAN', 'QR_SELF_SCAN', 'APP_SELF_CHECKIN'] },
  },
  renewals: {
    label: 'membership renewals (revenue)',
    dateField: 'renewedAt',
    numericFields: { amount: 'amountPaid' },
    dimensions: { payment_method: 'paymentMethod' },
    filters: { payment_method: 'paymentMethod' },
  },
} as const;

export type MetricEntity = keyof typeof METRIC_ENTITIES;
export type MetricAggregate = 'count' | 'sum' | 'avg';

export interface MetricQuery {
  entity: MetricEntity;
  aggregate: MetricAggregate;
  field?: string;
  groupBy?: string;
  where: Record<string, string | number | boolean>;
  range?: { gte?: Date; lte?: Date };
}

const AGGREGATES: MetricAggregate[] = ['count', 'sum', 'avg'];

export function validateMetricQuery(raw: Record<string, unknown>): MetricQuery {
  const entity = raw.entity as MetricEntity;
  if (!isEntity(entity)) {
    throw new Error(`Unknown entity "${String(raw.entity)}". Allowed: ${Object.keys(METRIC_ENTITIES).join(', ')}.`);
  }
  const config = METRIC_ENTITIES[entity];

  const aggregate = raw.metric as MetricAggregate;
  if (!AGGREGATES.includes(aggregate)) {
    throw new Error(`Unknown metric "${String(raw.metric)}". Allowed: ${AGGREGATES.join(', ')}.`);
  }

  const query: MetricQuery = { entity, aggregate, where: {} };

  if (aggregate !== 'count') {
    const field = resolve(config.numericFields, raw.field);
    if (!field) {
      throw new Error(`"${aggregate}" on ${entity} requires a numeric field. Allowed: ${keys(config.numericFields)}.`);
    }
    query.field = field;
  }

  if (raw.group_by != null) {
    const column = resolve(config.dimensions, raw.group_by);
    if (!column) {
      throw new Error(`Cannot group ${entity} by "${String(raw.group_by)}". Allowed: ${keys(config.dimensions)}.`);
    }
    query.groupBy = column;
  }

  if (Array.isArray(raw.filters)) {
    for (const entry of raw.filters as Array<Record<string, unknown>>) {
      const column = resolve(config.filters, entry.field);
      if (!column) {
        throw new Error(`Cannot filter ${entity} by "${String(entry.field)}". Allowed: ${keys(config.filters)}.`);
      }
      query.where[column] = normalizeFilterValue(entity, String(entry.field), entry.value);
    }
  }

  query.range = resolveDateRange(raw.date_range as Record<string, unknown> | undefined);
  return query;
}

export function resolveDateRange(range?: Record<string, unknown>): MetricQuery['range'] {
  if (!range) return undefined;

  if (typeof range.last_n_days === 'number') {
    const gte = new Date();
    gte.setDate(gte.getDate() - range.last_n_days);
    return { gte };
  }

  const now = new Date();
  switch (range.preset) {
    case 'today':
      return { gte: startOfDay(now) };
    case 'this_week': {
      const gte = startOfDay(now);
      gte.setDate(gte.getDate() - gte.getDay());
      return { gte };
    }
    case 'this_month':
      return { gte: new Date(now.getFullYear(), now.getMonth(), 1) };
  }

  const out: { gte?: Date; lte?: Date } = {};
  if (typeof range.from === 'string') out.gte = new Date(range.from);
  if (typeof range.to === 'string') out.lte = new Date(range.to);
  return out.gte || out.lte ? out : undefined;
}

function allowedFilterValues(entity: MetricEntity, alias: string): readonly string[] | undefined {
  const config = METRIC_ENTITIES[entity] as { filterValues?: Record<string, readonly string[]> };
  return config.filterValues?.[alias];
}

/**
 * Constrains an enum-like filter value to its whitelisted set and normalizes case, so a
 * model-supplied "active" resolves to the stored "ACTIVE" instead of silently matching nothing.
 * Non-enum filters pass through unchanged.
 */
function normalizeFilterValue(entity: MetricEntity, alias: string, value: unknown): string | number | boolean {
  const allowed = allowedFilterValues(entity, alias);
  if (allowed && typeof value === 'string') {
    const match = allowed.find((v) => v.toLowerCase() === value.toLowerCase());
    if (!match) {
      throw new Error(`Invalid value "${value}" for "${alias}". Allowed: ${allowed.join(', ')}.`);
    }
    return match;
  }
  return value as string | number | boolean;
}

/** Human-readable allowed filter values per entity, for the model's system prompt. */
export function describeFilterValues(entity: MetricEntity): string[] {
  const config = METRIC_ENTITIES[entity] as { filterValues?: Record<string, readonly string[]> };
  if (!config.filterValues) return [];
  return Object.entries(config.filterValues).map(([field, values]) => `${field} is one of ${values.join(', ')}`);
}

function isEntity(value: string): value is MetricEntity {
  return Object.prototype.hasOwnProperty.call(METRIC_ENTITIES, value);
}

function resolve(map: Record<string, string>, alias: unknown): string | undefined {
  return typeof alias === 'string' ? map[alias] : undefined;
}

function keys(map: Record<string, string>): string {
  const list = Object.keys(map);
  return list.length ? list.join(', ') : '(none)';
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}
