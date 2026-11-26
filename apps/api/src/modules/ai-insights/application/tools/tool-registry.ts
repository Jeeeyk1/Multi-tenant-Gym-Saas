import { Injectable } from '@nestjs/common';
import { InsightsRepository } from '../../infrastructure/persistence/insights.repository';
import { MembershipPlansRepository } from '../../../membership-plans/infrastructure/persistence/membership-plans.repository';
import type { LlmContent, LlmToolSchema } from '../../domain/llm.types';
import type { AuthenticatedUser } from '../../../../common/types/auth.types';
import { METRIC_ENTITIES, validateMetricQuery, describeFilterValues, type MetricEntity } from './metric.whitelist';
import { validateTrendQuery } from './trend.whitelist';
import { hasPermission } from '../../../../common/auth/authorization';
import { Permission } from '../../../../common/enums';
import { optionalString, requireString, type ToolCall, type ToolContext } from './tool-input';

export type { ToolCall, ToolContext } from './tool-input';

export interface ToolExecutionResult {
  /** Fed back into the model's conversation (already JSON-stringified). */
  content: LlmContent;
  /** Raw structured result, for surfacing to the UI as data instead of prose. Null on error. */
  data: unknown;
  isError: boolean;
}

// Staff get the assistant for day-to-day questions; money totals stay with the owner (reports.view).
const REVENUE_DENIED = 'Revenue figures are only available to the gym owner.';

function assertCanSeeRevenue(caller: AuthenticatedUser): void {
  if (!hasPermission(caller, Permission.REPORTS_VIEW)) throw new Error(REVENUE_DENIED);
}

const STEP_LABELS: Record<string, string> = {
  find_member: 'Looking up member',
  get_member_checkin_status: 'Checking check-in status',
  query_metric: 'Calculating metric',
  get_trend: 'Building trend',
  list_membership_plans: 'Loading membership plans',
};

@Injectable()
export class ToolRegistry {
  constructor(
    private readonly repo: InsightsRepository,
    private readonly plansRepo: MembershipPlansRepository,
  ) {}

  /** Read-only tools, run as soon as the model calls them. Actions are in ActionTools. */
  schemas(): LlmToolSchema[] {
    return this.readTools();
  }

  systemPrompt(): string {
    const lines = Object.entries(METRIC_ENTITIES).map(([entity, config]) => {
      const numeric = Object.keys(config.numericFields);
      const dimensions = Object.keys(config.dimensions);
      const parts = [`group/filter by: ${dimensions.length ? dimensions.join(', ') : 'none'}`];
      if (numeric.length) parts.push(`sum/avg fields: ${numeric.join(', ')}`);
      const values = describeFilterValues(entity as MetricEntity);
      if (values.length) parts.push(`filter values — ${values.join('; ')}`);
      return `- ${entity} (${config.label}): ${parts.join('; ')}`;
    });

    return [
      'You are an assistant for a gym manager. Answer questions and perform actions using the provided tools.',
      'Only report data returned by the tools. Never invent numbers. If a question is outside the available data, say so.',
      'Keep answers short and direct. Format dates for a human reader.',
      'All monetary amounts are in Philippine Pesos. Always format currency with the ₱ symbol (e.g. ₱1,234.00) — never $ or USD.',
      'Reply in plain text only. Do not use Markdown formatting — no **bold**, no bullet symbols, no headings.',
      '',
      'query_metric covers these entities:',
      ...lines,
      '',
      'Date ranges accept: { "preset": "today" | "this_week" | "this_month" }, { "last_n_days": N }, or { "from": "YYYY-MM-DD", "to": "YYYY-MM-DD" }.',
      'get_trend returns one row per period (zero-filled). Check-in methods: MANUAL_STAFF, QR_STAFF_SCAN, QR_SELF_SCAN, APP_SELF_CHECKIN.',
      '',
      'Actions you can take: register_member (invite by email), renew_membership, suspend_member, reactivate_member.',
      'Resolve a member with find_member first (to get member_id). Use list_membership_plans to get a plan_id.',
      'If a required detail is missing or unclear (which member, which plan, the amount paid), ask the user first.',
      'Once you have the details, call the action tool. It does not run yet: the app shows the user a summary with a',
      'confirm button, and only the user can confirm. Do not ask the user to type "yes"; the button does that.',
      'Propose one action per answer. If an action was proposed earlier in the chat, do not propose it again unless asked.',
    ].join('\n');
  }

  async execute(call: ToolCall, ctx: ToolContext): Promise<ToolExecutionResult> {
    try {
      const data = await this.dispatch(call, ctx);
      return {
        content: { type: 'tool_result', toolUseId: call.id, content: JSON.stringify(data) },
        data,
        isError: false,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Tool execution failed';
      return {
        content: { type: 'tool_result', toolUseId: call.id, content: message, isError: true },
        data: null,
        isError: true,
      };
    }
  }

  /** Human-readable label for the step-by-step UI while a tool call is in flight. */
  stepLabel(toolName: string): string {
    return STEP_LABELS[toolName] ?? 'Working';
  }

  private async dispatch(call: ToolCall, ctx: ToolContext): Promise<unknown> {
    const { gymId, caller } = ctx;
    const input = call.input;

    switch (call.name) {
      case 'find_member':
        return this.repo.findMembers(gymId, requireString(input.name, 'name'));
      case 'get_member_checkin_status':
        return this.repo.getMemberCheckinStatus(
          gymId,
          requireString(input.member_id, 'member_id'),
          optionalString(input.date),
        );
      case 'query_metric': {
        const query = validateMetricQuery(input);
        if (query.entity === 'renewals' && query.aggregate !== 'count') assertCanSeeRevenue(caller);
        return this.repo.runMetric(gymId, query);
      }
      case 'get_trend': {
        const query = validateTrendQuery(input);
        if (query.field === 'amount') assertCanSeeRevenue(caller);
        return this.repo.runTrend(gymId, query);
      }

      case 'list_membership_plans': {
        const plans = await this.plansRepo.listByGym(gymId);
        return plans
          .filter((plan) => plan.isActive)
          .map((plan) => ({ id: plan.id, name: plan.name, price: Number(plan.price), durationDays: plan.durationDays }));
      }

      default:
        throw new Error(`Unknown tool "${call.name}"`);
    }
  }

  private readTools(): LlmToolSchema[] {
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
      {
        name: 'list_membership_plans',
        description: 'List the gym\'s active membership plans with their id, price and duration. Use to pick a plan_id before inviting or renewing a member.',
        inputSchema: { type: 'object', properties: {} },
      },
    ];
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
