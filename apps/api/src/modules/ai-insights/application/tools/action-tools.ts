import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { InsightsRepository } from '../../infrastructure/persistence/insights.repository';
import { MembershipPlansRepository } from '../../../membership-plans/infrastructure/persistence/membership-plans.repository';
import { RegisterMemberUseCase, type RegisterMemberInput } from '../../../members/application/use-cases/register-member.use-case';
import { SuspendMemberUseCase } from '../../../members/application/use-cases/suspend-member.use-case';
import { ReactivateMemberUseCase } from '../../../members/application/use-cases/reactivate-member.use-case';
import {
  RenewMembershipUseCase,
  type RenewMembershipInput,
} from '../../../renewals/application/use-cases/renew-membership.use-case';
import { assertPermission } from '../../../../common/auth/authorization';
import { AssistantAction, MemberStatus, Permission } from '../../../../common/enums';
import { ISO_DATE_PATTERN } from '../../../../common/time/local-date';
import type { AuthenticatedUser } from '../../../../common/types/auth.types';
import type { LlmToolSchema } from '../../domain/llm.types';
import { PENDING_ACTION_TTL_SECONDS, type PendingAction } from '../../domain/pending-action';
import {
  ToolInputError,
  optionalString,
  requireNumber,
  requireString,
  requireUuid,
  type ToolCall,
  type ToolContext,
} from './tool-input';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Same rules as the renew endpoint (positive, 2 decimals), plus a ceiling against a misread amount.
const MAX_AMOUNT_PAID = 1_000_000;
const MEMBER_ID_HINT = 'Use find_member to get the member_id.';
const PLAN_ID_HINT = 'Use list_membership_plans to get a plan_id.';

const ACTION_PERMISSION: Record<AssistantAction, Permission> = {
  [AssistantAction.REGISTER_MEMBER]: Permission.MEMBERS_CREATE,
  [AssistantAction.RENEW_MEMBERSHIP]: Permission.MEMBERS_RENEW,
  [AssistantAction.SUSPEND_MEMBER]: Permission.MEMBERS_SUSPEND,
  [AssistantAction.REACTIVATE_MEMBER]: Permission.MEMBERS_EDIT,
};

type Proposal = Pick<PendingAction, 'input' | 'summary' | 'confirmLabel' | 'doneMessage'>;

export function isAssistantAction(name: string): name is AssistantAction {
  return (Object.values(AssistantAction) as string[]).includes(name);
}

// Tolerance, because 0.29 * 100 is 28.999999999999996 in floating point.
const hasAtMostTwoDecimals = (amount: number) => Math.abs(amount * 100 - Math.round(amount * 100)) < 1e-6;

const peso = (amount: number) => `₱${amount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/**
 * The assistant's tools that change data. The model only proposes them: `propose` checks the
 * input and the caller's permission and describes the action, and `run` performs it after the
 * person confirms in the app. Nothing here runs because the model said so.
 */
@Injectable()
export class ActionTools {
  constructor(
    private readonly repo: InsightsRepository,
    private readonly plansRepo: MembershipPlansRepository,
    private readonly registerMember: RegisterMemberUseCase,
    private readonly renewMembership: RenewMembershipUseCase,
    private readonly suspendMember: SuspendMemberUseCase,
    private readonly reactivateMember: ReactivateMemberUseCase,
  ) {}

  /**
   * Throws (with a message for the model) when the input is invalid, the caller can't do this, or it
   * would certainly fail (e.g. suspending someone already suspended). The use case still checks at run time.
   */
  async propose(call: ToolCall & { name: AssistantAction }, ctx: ToolContext): Promise<PendingAction> {
    assertPermission(ctx.caller, ACTION_PERMISSION[call.name]);
    const proposal = await this.describe(call.name, call.input, ctx.gymId);
    return {
      id: randomUUID(),
      gymId: ctx.gymId,
      userId: ctx.caller.sub,
      action: call.name,
      ...proposal,
      expiresAt: new Date(Date.now() + PENDING_ACTION_TTL_SECONDS * 1000).toISOString(),
    };
  }

  /** Runs a confirmed action. The use cases check gym access and permissions again. */
  async run(pending: PendingAction, caller: AuthenticatedUser): Promise<void> {
    const { gymId, input } = pending;
    switch (pending.action) {
      case AssistantAction.REGISTER_MEMBER:
        await this.registerMember.execute(gymId, input as unknown as RegisterMemberInput, caller);
        return;
      case AssistantAction.RENEW_MEMBERSHIP: {
        const { memberId, ...renewal } = input as unknown as RenewMembershipInput & { memberId: string };
        await this.renewMembership.execute(gymId, memberId, renewal, caller);
        return;
      }
      case AssistantAction.SUSPEND_MEMBER:
        await this.suspendMember.execute(gymId, String(input.memberId), caller);
        return;
      case AssistantAction.REACTIVATE_MEMBER:
        await this.reactivateMember.execute(gymId, String(input.memberId), caller);
        return;
    }
  }

  private async describe(action: AssistantAction, raw: Record<string, unknown>, gymId: string): Promise<Proposal> {
    switch (action) {
      case AssistantAction.REGISTER_MEMBER: {
        const email = requireString(raw.email, 'email').trim().toLowerCase();
        if (!EMAIL_RE.test(email)) throw new ToolInputError('A valid email address is required');
        const fullName = requireString(raw.full_name, 'full_name').trim();
        const planId = optionalString(raw.plan_id);
        const expiryDate = optionalString(raw.expiry_date);
        if (!planId && !expiryDate) throw new ToolInputError('Either plan_id or expiry_date is required');
        if (expiryDate && !ISO_DATE_PATTERN.test(expiryDate)) throw new ToolInputError('expiry_date must be YYYY-MM-DD');
        const terms = planId ? `on ${await this.planLabel(planId, gymId)}` : `until ${expiryDate}`;
        const input: RegisterMemberInput = { email, fullName, phone: optionalString(raw.phone), planId, expiryDate };
        return {
          input: { ...input },
          summary: `Invite ${fullName} (${email}) ${terms}. They'll get an invite email.`,
          confirmLabel: 'Send invite',
          doneMessage: `Invited ${fullName}. The invite email is on its way to ${email}.`,
        };
      }

      case AssistantAction.RENEW_MEMBERSHIP: {
        const member = await this.member(raw.member_id, gymId);
        const amountPaid = requireNumber(raw.amount_paid, 'amount_paid');
        if (amountPaid <= 0) throw new ToolInputError('"amount_paid" must be more than zero');
        if (!hasAtMostTwoDecimals(amountPaid)) throw new ToolInputError('"amount_paid" can have at most 2 decimals');
        if (amountPaid > MAX_AMOUNT_PAID) throw new ToolInputError(`"amount_paid" looks too high. Check the amount with the user.`);
        const planId = optionalString(raw.plan_id);
        if (!planId && !member.hasPlan) {
          throw new ToolInputError(`${member.name} has no plan yet. Ask which plan, then pass plan_id. ${PLAN_ID_HINT}`);
        }
        const paymentMethod = optionalString(raw.payment_method);
        const planPart = planId ? ` on ${await this.planLabel(planId, gymId)}` : '';
        const paidPart = `${peso(amountPaid)} paid${paymentMethod ? ` by ${paymentMethod}` : ''}`;
        const input: RenewMembershipInput & { memberId: string } = {
          memberId: member.memberId,
          planId,
          amountPaid,
          paymentMethod,
          notes: optionalString(raw.notes),
        };
        return {
          input: { ...input },
          summary: `Renew ${member.label}${planPart}, ${paidPart}.`,
          confirmLabel: 'Renew',
          doneMessage: `Renewed ${member.name}'s membership.`,
        };
      }

      case AssistantAction.SUSPEND_MEMBER: {
        const member = await this.member(raw.member_id, gymId);
        if (member.status === MemberStatus.SUSPENDED) throw new ToolInputError(`${member.name} is already suspended.`);
        return {
          input: { memberId: member.memberId },
          summary: `Suspend ${member.label}. They won't be able to check in until reactivated.`,
          confirmLabel: 'Suspend',
          doneMessage: `Suspended ${member.name}.`,
        };
      }

      case AssistantAction.REACTIVATE_MEMBER: {
        const member = await this.member(raw.member_id, gymId);
        if (member.status === MemberStatus.ACTIVE) throw new ToolInputError(`${member.name} is already active.`);
        return {
          input: { memberId: member.memberId },
          summary: `Reactivate ${member.label}.`,
          confirmLabel: 'Reactivate',
          doneMessage: `Reactivated ${member.name}.`,
        };
      }
    }
  }

  private async member(rawId: unknown, gymId: string) {
    const member = await this.repo.findMemberById(gymId, requireUuid(rawId, 'member_id', MEMBER_ID_HINT));
    if (!member) throw new ToolInputError(`No member with that id in this gym. ${MEMBER_ID_HINT}`);
    return { ...member, label: `${member.name} (${member.membershipNumber})` };
  }

  private async planLabel(planId: string, gymId: string): Promise<string> {
    const plan = await this.plansRepo.findById(requireUuid(planId, 'plan_id', PLAN_ID_HINT), gymId);
    if (!plan || !plan.isActive) throw new ToolInputError(`No active plan with that id. ${PLAN_ID_HINT}`);
    return `${plan.name} (${peso(Number(plan.price))}, ${plan.durationDays} days)`;
  }

  schemas(): LlmToolSchema[] {
    const confirmNote = 'The app asks the user to confirm before anything happens.';
    return [
      {
        name: AssistantAction.REGISTER_MEMBER,
        description: `Invite a new member by email (sends an invite email). Needs plan_id (from list_membership_plans) OR expiry_date. ${confirmNote}`,
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
        name: AssistantAction.RENEW_MEMBERSHIP,
        description: `Renew a member's membership. Resolve member_id with find_member first. ${confirmNote}`,
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
        name: AssistantAction.SUSPEND_MEMBER,
        description: `Suspend a member. Resolve member_id with find_member first. ${confirmNote}`,
        inputSchema: { type: 'object', properties: { member_id: { type: 'string' } }, required: ['member_id'] },
      },
      {
        name: AssistantAction.REACTIVATE_MEMBER,
        description: `Reactivate a suspended member. Resolve member_id with find_member first. ${confirmNote}`,
        inputSchema: { type: 'object', properties: { member_id: { type: 'string' } }, required: ['member_id'] },
      },
    ];
  }
}
