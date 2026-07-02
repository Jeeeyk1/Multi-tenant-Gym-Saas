import { Injectable } from '@nestjs/common';
import { InsightsRepository } from '../../infrastructure/persistence/insights.repository';
import type { LlmContent, LlmToolSchema } from '../../domain/llm.types';
import { METRIC_ENTITIES, validateMetricQuery } from './metric.whitelist';
import { validateTrendQuery } from './trend.whitelist';

interface ToolCall {
  id: string;
  name: string;
  input: Record<string, unknown>;
}

@Injectable()
export class ToolRegistry {
  constructor(private readonly repo: InsightsRepository) {}

  schemas(): LlmToolSchema[] {
    return [
      {
        name: 'find_member',
        description: 'Find members of this gym by full or partial name. Returns matches with their member id, used as input to other tools.',
        inputSchema: {
          type: 'object',
          properties: { name: { type: 'string', description: 'Full or partial member name' } },
          required: ['name'],
        },
      },
      {
        name: 'get_member_checkin_status',
        description: 'Check whether a specific member checked in on a given day. Resolve the member id with find_member first.',
        inputSchema: {
          type: 'object',
          properties: {
            member_id: { type: 'string', description: 'Member id from find_member' },
            date: { type: 'string', description: 'Day to check in YYYY-MM-DD. Defaults to today.' },
          },
          required: ['member_id'],
        },
      },
      {
        name: 'query_metric',
        description: 'Aggregate gym data: counts, sums and averages over members, check-ins and renewals, optionally grouped and filtered. Use this for single totals or grouped breakdowns.',
        inputSchema: this.metricSchema(),
      },
      {
        name: 'get_trend',
        description: 'Time-series data over a period — returns one value per day, week or month. Use this for trend questions: "per day", "week by week", "each month".',
        inputSchema: {
          type: 'object',
          properties: {
            entity: { type: 'string', enum: Object.keys(METRIC_ENTITIES) },
            granularity: { type: 'string', enum: ['day', 'week', 'month'] },
            field: { type: 'string', enum: ['amount'], description: 'Renewals only. Omit to count.' },
            date_range: { type: 'object', description: 'Same format as query_metric. Defaults: 30d/12w/12m by granularity.' },
          },
          required: ['entity', 'granularity'],
        },
      },
    ];
  }

  systemPrompt(): string {
    const lines = Object.entries(METRIC_ENTITIES).map(([entity, config]) => {
      const numeric = Object.keys(config.numericFields);
      const dimensions = Object.keys(config.dimensions);
      const parts = [`group/filter by: ${dimensions.length ? dimensions.join(', ') : 'none'}`];
      if (numeric.length) parts.push(`sum/avg fields: ${numeric.join(', ')}`);
      return `- ${entity} (${config.label}): ${parts.join('; ')}`;
    });

    return [
      'You are an analytics assistant for a gym manager. Answer questions about this gym using the provided tools.',
      'Only report data returned by the tools. Never invent numbers. If a question is outside the available data, say so.',
      'Keep answers short and direct. Format currency and dates for a human reader.',
      '',
      'query_metric covers these entities:',
      ...lines,
      '',
      'Date ranges accept: { "preset": "today" | "this_week" | "this_month" }, { "last_n_days": N }, or { "from": "YYYY-MM-DD", "to": "YYYY-MM-DD" }.',
      '',
      'get_trend returns one row per period (zero-filled). Check-in methods: MANUAL_STAFF, QR_STAFF_SCAN, QR_SELF_SCAN, APP_SELF_CHECKIN.',
    ].join('\n');
  }

  async execute(call: ToolCall, gymId: string): Promise<LlmContent> {
    try {
      const result = await this.dispatch(call, gymId);
      return { type: 'tool_result', toolUseId: call.id, content: JSON.stringify(result) };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Tool execution failed';
      return { type: 'tool_result', toolUseId: call.id, content: message, isError: true };
    }
  }

  private dispatch(call: ToolCall, gymId: string): Promise<unknown> {
    switch (call.name) {
      case 'find_member':
        return this.repo.findMembers(gymId, requireString(call.input.name, 'name'));
      case 'get_member_checkin_status':
        return this.repo.getMemberCheckinStatus(
          gymId,
          requireString(call.input.member_id, 'member_id'),
          typeof call.input.date === 'string' ? call.input.date : undefined,
        );
      case 'query_metric':
        return this.repo.runMetric(gymId, validateMetricQuery(call.input));
      case 'get_trend':
        return this.repo.runTrend(gymId, validateTrendQuery(call.input));
      default:
        throw new Error(`Unknown tool "${call.name}"`);
    }
  }

  private metricSchema(): Record<string, unknown> {
    const aliasUnion = (pick: (config: (typeof METRIC_ENTITIES)[keyof typeof METRIC_ENTITIES]) => Record<string, string>) =>
      [...new Set(Object.values(METRIC_ENTITIES).flatMap((config) => Object.keys(pick(config))))];

    return {
      type: 'object',
      properties: {
        entity: { type: 'string', enum: Object.keys(METRIC_ENTITIES) },
        metric: { type: 'string', enum: ['count', 'sum', 'avg'] },
        field: { type: 'string', enum: aliasUnion((c) => c.numericFields), description: 'Required for sum/avg.' },
        group_by: { type: 'string', enum: aliasUnion((c) => c.dimensions) },
        filters: {
          type: 'array',
          items: {
            type: 'object',
            properties: { field: { type: 'string' }, value: {} },
            required: ['field', 'value'],
          },
        },
        date_range: { type: 'object' },
      },
      required: ['entity', 'metric'],
    };
  }
}

function requireString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`"${field}" is required`);
  }
  return value;
}
