import { Injectable } from '@nestjs/common';
import { InsightsRepository } from '../../infrastructure/persistence/insights.repository';
import { MembershipPlansRepository } from '../../../membership-plans/infrastructure/persistence/membership-plans.repository';
import { RegisterMemberUseCase } from '../../../members/application/use-cases/register-member.use-case';
import { SuspendMemberUseCase } from '../../../members/application/use-cases/suspend-member.use-case';
import { ReactivateMemberUseCase } from '../../../members/application/use-cases/reactivate-member.use-case';
import { RenewMembershipUseCase } from '../../../renewals/application/use-cases/renew-membership.use-case';
import type { LlmContent, LlmToolSchema } from '../../domain/llm.types';
import type { AuthenticatedUser } from '../../../../common/types/auth.types';
import { METRIC_ENTITIES, validateMetricQuery, describeFilterValues, type MetricEntity } from './metric.whitelist';
import { validateTrendQuery } from './trend.whitelist';
import { hasPermission } from '../../../../common/auth/authorization';
import { Permission } from '../../../../common/enums';

interface ToolCall {
  id: string;
  name: string;
  input: Record<string, unknown>;
}

export interface ToolContext {
  gymId: string;
  caller: AuthenticatedUser;
}

export interface ToolExecutionResult {
  /** Fed back into the model's conversation (already JSON-stringified). */
  content: LlmContent;
  /** Raw structured result, for surfacing to the UI as data instead of prose. Null on error. */
  data: unknown;
  isError: boolean;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
  register_member: 'Inviting member',
  renew_membership: 'Renewing membership',
  suspend_member: 'Suspending member',
  reactivate_member: 'Reactivating member',
};

@Injectable()
export class ToolRegistry {
  constructor(
    private readonly repo: InsightsRepository,
    private readonly plansRepo: MembershipPlansRepository,
    private readonly registerMember: RegisterMemberUseCase,
    private readonly renewMembership: RenewMembershipUseCase,
    private readonly suspendMember: SuspendMemberUseCase,
    private readonly reactivateMember: ReactivateMemberUseCase,
  ) {}

  schemas(): LlmToolSchema[] {
    return [...this.readTools(), ...this.actionTools()];
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
      '',
      'CONFIRMATION RULE — this is mandatory for any action that changes data or sends an email',
      '(register_member, renew_membership, suspend_member, reactivate_member):',
      '1. Gather every required detail.',
      '2. Summarize exactly what you are about to do and ask the user to confirm.',
      '3. Call the tool ONLY after the user explicitly confirms (e.g. "yes", "go ahead").',
      'Never call an action tool in the same turn you first propose it. If unconfirmed, ask — do not act.',
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

      case 'register_member': {
        const email = requireString(input.email, 'email');
        if (!EMAIL_RE.test(email)) throw new Error('A valid email address is required');
        const fullName = requireString(input.full_name, 'full_name');
        const planId = optionalString(input.plan_id);
        const expiryDate = optionalString(input.expiry_date);
        if (!planId && !expiryDate) throw new Error('Either plan_id or expiry_date is required');
        await this.registerMember.execute(
          gymId,
          { email, fullName, phone: optionalString(input.phone), planId, expiryDate },
          caller,
        );
        return { ok: true, invitedEmail: email, fullName };
      }

      case 'renew_membership': {
        const memberId = requireString(input.member_id, 'member_id');
        const amountPaid = requireNumber(input.amount_paid, 'amount_paid');
        await this.renewMembership.execute(
          gymId,
          memberId,
          {
            planId: optionalString(input.plan_id),
            amountPaid,
            paymentMethod: optionalString(input.payment_method),
            notes: optionalString(input.notes),
          },
          caller,
        );
        return { ok: true, memberId };
      }

      case 'suspend_member': {
        const memberId = requireString(input.member_id, 'member_id');
        await this.suspendMember.execute(gymId, memberId, caller);
        return { ok: true, memberId, status: 'SUSPENDED' };
      }

      case 'reactivate_member': {
        const memberId = requireString(input.member_id, 'member_id');
        await this.reactivateMember.execute(gymId, memberId, caller);
        return { ok: true, memberId, status: 'ACTIVE' };
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

  private actionTools(): LlmToolSchema[] {
    return [
      {
        name: 'register_member',
        description: 'Invite a new member by email (sends an invite email). Needs plan_id (from list_membership_plans) OR expiry_date. Confirm all details with the user before calling.',
        inputSchema: {
          type: 'object',
          properties: {
            email: { type: 'string' },
            full_name: { type: 'string' },
            phone: { type: 'string' },
            plan_id: { type: 'string', description: 'From list_membership_plans' },
            expiry_date: { type: 'string', description: 'YYYY-MM-DD, only if no plan_id' },
          },
          required: ['email', 'full_name'],
        },
      },
      {
        name: 'renew_membership',
        description: 'Renew a member\'s membership. Resolve member_id with find_member first. Confirm with the user before calling.',
        inputSchema: {
          type: 'object',
          properties: {
            member_id: { type: 'string' },
            plan_id: { type: 'string', description: 'From list_membership_plans' },
            amount_paid: { type: 'number' },
            payment_method: { type: 'string' },
            notes: { type: 'string' },
          },
          required: ['member_id', 'amount_paid'],
        },
      },
      {
        name: 'suspend_member',
        description: 'Suspend a member. Resolve member_id with find_member first. Confirm with the user before calling.',
        inputSchema: {
          type: 'object',
          properties: { member_id: { type: 'string' } },
          required: ['member_id'],
        },
      },
      {
        name: 'reactivate_member',
        description: 'Reactivate a suspended member. Resolve member_id with find_member first. Confirm with the user before calling.',
        inputSchema: {
          type: 'object',
          properties: { member_id: { type: 'string' } },
          required: ['member_id'],
        },
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

function requireString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`"${field}" is required`);
  }
  return value;
}

function optionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() !== '' ? value : undefined;
}

function requireNumber(value: unknown, field: string): number {
  const num = typeof value === 'string' ? Number(value) : value;
  if (typeof num !== 'number' || Number.isNaN(num)) {
    throw new Error(`"${field}" must be a number`);
  }
  return num;
}
