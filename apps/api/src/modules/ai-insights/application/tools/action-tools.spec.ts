import { ActionTools, isAssistantAction } from './action-tools';
import { ToolInputError, type ToolContext } from './tool-input';
import type { InsightsRepository } from '../../infrastructure/persistence/insights.repository';
import type { MembershipPlansRepository } from '../../../membership-plans/infrastructure/persistence/membership-plans.repository';
import type { RegisterMemberUseCase } from '../../../members/application/use-cases/register-member.use-case';
import type { SuspendMemberUseCase } from '../../../members/application/use-cases/suspend-member.use-case';
import type { ReactivateMemberUseCase } from '../../../members/application/use-cases/reactivate-member.use-case';
import type { RenewMembershipUseCase } from '../../../renewals/application/use-cases/renew-membership.use-case';
import type { AuthenticatedUser } from '../../../../common/types/auth.types';
import { AssistantAction } from '../../../../common/enums';

const repo = { findMemberById: jest.fn() } as unknown as jest.Mocked<InsightsRepository>;
const plansRepo = { findById: jest.fn() } as unknown as jest.Mocked<MembershipPlansRepository>;
const registerMember = { execute: jest.fn() } as unknown as jest.Mocked<RegisterMemberUseCase>;
const renewMembership = { execute: jest.fn() } as unknown as jest.Mocked<RenewMembershipUseCase>;
const suspendMember = { execute: jest.fn() } as unknown as jest.Mocked<SuspendMemberUseCase>;
const reactivateMember = { execute: jest.fn() } as unknown as jest.Mocked<ReactivateMemberUseCase>;

const M1 = '11111111-1111-4111-8111-111111111111';
const P1 = '22222222-2222-4222-8222-222222222222';

const caller: AuthenticatedUser = {
  type: 'gym',
  sub: 'staff-1',
  gymId: 'gym-1',
  roles: ['STAFF'],
  permissions: ['insights.query', 'members.create', 'members.renew', 'members.suspend', 'members.edit'],
};
const ctx: ToolContext = { gymId: 'gym-1', caller };
const juan = { memberId: M1, name: 'Juan Cruz', membershipNumber: 'MBR-0001', status: 'ACTIVE', hasPlan: true };
const monthly = { id: P1, name: 'Monthly', price: 500, durationDays: 30, isActive: true };

const tools = () => new ActionTools(repo, plansRepo, registerMember, renewMembership, suspendMember, reactivateMember);
const call = (name: AssistantAction, input: Record<string, unknown>) => ({ id: 'c1', name, input });

describe('ActionTools', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    repo.findMemberById.mockResolvedValue(juan as never);
    plansRepo.findById.mockResolvedValue(monthly as never);
  });

  it('recognises the action tools by name', () => {
    expect(isAssistantAction('suspend_member')).toBe(true);
    expect(isAssistantAction('query_metric')).toBe(false);
  });

  describe('propose', () => {
    it('describes a suspension for the person and gym, without running it', async () => {
      const pending = await tools().propose(call(AssistantAction.SUSPEND_MEMBER, { member_id: M1 }), ctx);

      expect(repo.findMemberById).toHaveBeenCalledWith('gym-1', M1);
      expect(suspendMember.execute).not.toHaveBeenCalled();
      expect(pending).toMatchObject({
        gymId: 'gym-1',
        userId: 'staff-1',
        action: 'suspend_member',
        input: { memberId: M1 },
        summary: expect.stringContaining('Juan Cruz (MBR-0001)'),
        confirmLabel: 'Suspend',
      });
      expect(Date.parse(pending.expiresAt)).toBeGreaterThan(Date.now());
    });

    it('describes an invite with the plan, and normalises the email', async () => {
      const pending = await tools().propose(
        call(AssistantAction.REGISTER_MEMBER, { email: ' Jane@Example.com', full_name: 'Jane Doe', plan_id: P1 }),
        ctx,
      );
      expect(plansRepo.findById).toHaveBeenCalledWith(P1, 'gym-1');
      expect(pending.input).toEqual({ email: 'jane@example.com', fullName: 'Jane Doe', phone: undefined, planId: P1, expiryDate: undefined });
      expect(pending.summary).toBe("Invite Jane Doe (jane@example.com) on Monthly (₱500.00, 30 days). They'll get an invite email.");
    });

    it('describes a renewal with the amount in pesos', async () => {
      const pending = await tools().propose(
        call(AssistantAction.RENEW_MEMBERSHIP, { member_id: M1, plan_id: P1, amount_paid: 500, payment_method: 'cash' }),
        ctx,
      );
      expect(pending.summary).toBe('Renew Juan Cruz (MBR-0001) on Monthly (₱500.00, 30 days), ₱500.00 paid by cash.');
      expect(pending.input).toMatchObject({ memberId: M1, planId: P1, amountPaid: 500 });
    });

    it('refuses a member from another gym (or a made-up id)', async () => {
      repo.findMemberById.mockResolvedValue(null);
      await expect(tools().propose(call(AssistantAction.SUSPEND_MEMBER, { member_id: '33333333-3333-4333-8333-333333333333' }), ctx)).rejects.toThrow(
        'find_member',
      );
    });

    it('refuses an inactive or unknown plan', async () => {
      plansRepo.findById.mockResolvedValue({ ...monthly, isActive: false } as never);
      await expect(
        tools().propose(call(AssistantAction.REGISTER_MEMBER, { email: 'a@b.co', full_name: 'A', plan_id: P1 }), ctx),
      ).rejects.toThrow('list_membership_plans');
    });

    it('uses the renew endpoint rules for the amount', async () => {
      const renew = (amount_paid: unknown) => tools().propose(call(AssistantAction.RENEW_MEMBERSHIP, { member_id: M1, amount_paid }), ctx);
      await expect(renew(0)).rejects.toThrow('more than zero');
      await expect(renew(10.555)).rejects.toThrow('2 decimals');
      await expect(renew(5_000_000)).rejects.toThrow('too high');
      await expect(renew(0.29)).resolves.toMatchObject({ input: { amountPaid: 0.29 } });
    });

    it("refuses what would certainly fail: already suspended, already active, renewing with no plan", async () => {
      repo.findMemberById.mockResolvedValueOnce({ ...juan, status: 'SUSPENDED' } as never);
      await expect(tools().propose(call(AssistantAction.SUSPEND_MEMBER, { member_id: M1 }), ctx)).rejects.toThrow('already suspended');
      await expect(tools().propose(call(AssistantAction.REACTIVATE_MEMBER, { member_id: M1 }), ctx)).rejects.toThrow('already active');
      repo.findMemberById.mockResolvedValueOnce({ ...juan, hasPlan: false } as never);
      await expect(
        tools().propose(call(AssistantAction.RENEW_MEMBERSHIP, { member_id: M1, amount_paid: 500 }), ctx),
      ).rejects.toThrow('no plan yet');
    });

    it('refuses an id that is not a uuid without querying (e.g. a membership number)', async () => {
      await expect(tools().propose(call(AssistantAction.SUSPEND_MEMBER, { member_id: 'MBR-0001' }), ctx)).rejects.toBeInstanceOf(
        ToolInputError,
      );
      expect(repo.findMemberById).not.toHaveBeenCalled();
    });

    it('checks the input', async () => {
      await expect(
        tools().propose(call(AssistantAction.REGISTER_MEMBER, { email: 'not-an-email', full_name: 'A', plan_id: 'p' }), ctx),
      ).rejects.toThrow('email');
      await expect(tools().propose(call(AssistantAction.REGISTER_MEMBER, { email: 'a@b.co', full_name: 'A' }), ctx)).rejects.toThrow(
        'plan_id or expiry_date',
      );
    });

    it("refuses an action the caller isn't allowed to do, before looking anything up", async () => {
      const noSuspend: ToolContext = { ...ctx, caller: { ...caller, permissions: ['insights.query'] } };
      await expect(tools().propose(call(AssistantAction.SUSPEND_MEMBER, { member_id: M1 }), noSuspend)).rejects.toMatchObject({
        code: 'PERMISSION_DENIED',
      });
      expect(repo.findMemberById).not.toHaveBeenCalled();
    });
  });

  describe('run', () => {
    const base = { id: 'a1', gymId: 'gym-1', userId: 'staff-1', summary: '', confirmLabel: '', doneMessage: '', expiresAt: '' };

    it('runs the stored invite with the caller', async () => {
      const input = { email: 'jane@example.com', fullName: 'Jane Doe', planId: P1 };
      await tools().run({ ...base, action: AssistantAction.REGISTER_MEMBER, input }, caller);
      expect(registerMember.execute).toHaveBeenCalledWith('gym-1', input, caller);
    });

    it('runs the stored renewal with the member id split out', async () => {
      await tools().run(
        { ...base, action: AssistantAction.RENEW_MEMBERSHIP, input: { memberId: M1, planId: P1, amountPaid: 500 } },
        caller,
      );
      expect(renewMembership.execute).toHaveBeenCalledWith('gym-1', M1, { planId: P1, amountPaid: 500 }, caller);
    });

    it('runs suspend and reactivate', async () => {
      await tools().run({ ...base, action: AssistantAction.SUSPEND_MEMBER, input: { memberId: M1 } }, caller);
      await tools().run({ ...base, action: AssistantAction.REACTIVATE_MEMBER, input: { memberId: M1 } }, caller);
      expect(suspendMember.execute).toHaveBeenCalledWith('gym-1', M1, caller);
      expect(reactivateMember.execute).toHaveBeenCalledWith('gym-1', M1, caller);
    });
  });
});
