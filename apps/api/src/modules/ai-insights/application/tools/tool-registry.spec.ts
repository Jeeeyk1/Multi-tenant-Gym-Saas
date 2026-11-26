import { ToolRegistry, type ToolContext } from './tool-registry';
import type { InsightsRepository } from '../../infrastructure/persistence/insights.repository';
import type { MembershipPlansRepository } from '../../../membership-plans/infrastructure/persistence/membership-plans.repository';
import type { RegisterMemberUseCase } from '../../../members/application/use-cases/register-member.use-case';
import type { SuspendMemberUseCase } from '../../../members/application/use-cases/suspend-member.use-case';
import type { ReactivateMemberUseCase } from '../../../members/application/use-cases/reactivate-member.use-case';
import type { RenewMembershipUseCase } from '../../../renewals/application/use-cases/renew-membership.use-case';
import type { AuthenticatedUser } from '../../../../common/types/auth.types';
import { ForbiddenError } from '../../../../common/errors';

const repo = { findMembers: jest.fn(), runMetric: jest.fn(), runTrend: jest.fn() } as unknown as jest.Mocked<InsightsRepository>;
const plansRepo = { listByGym: jest.fn() } as unknown as jest.Mocked<MembershipPlansRepository>;
const registerMember = { execute: jest.fn() } as unknown as jest.Mocked<RegisterMemberUseCase>;
const renewMembership = { execute: jest.fn() } as unknown as jest.Mocked<RenewMembershipUseCase>;
const suspendMember = { execute: jest.fn() } as unknown as jest.Mocked<SuspendMemberUseCase>;
const reactivateMember = { execute: jest.fn() } as unknown as jest.Mocked<ReactivateMemberUseCase>;

const caller: AuthenticatedUser = {
  type: 'gym',
  sub: 'staff-1',
  gymId: 'gym-1',
  roles: ['MANAGER'],
  permissions: ['insights.query', 'members.create'],
};
const ctx: ToolContext = { gymId: 'gym-1', caller };

function makeRegistry() {
  return new ToolRegistry(repo, plansRepo, registerMember, renewMembership, suspendMember, reactivateMember);
}

describe('ToolRegistry action tools', () => {
  let registry: ToolRegistry;

  beforeEach(() => {
    jest.clearAllMocks();
    registry = makeRegistry();
  });

  it('routes register_member to the use case with the caller and gymId injected', async () => {
    registerMember.execute.mockResolvedValue({} as never);

    const result = await registry.execute(
      { id: 'c1', name: 'register_member', input: { email: 'jane@example.com', full_name: 'Jane Doe', plan_id: 'plan-1' } },
      ctx,
    );

    expect(registerMember.execute).toHaveBeenCalledWith(
      'gym-1',
      { email: 'jane@example.com', fullName: 'Jane Doe', phone: undefined, planId: 'plan-1', expiryDate: undefined },
      caller,
    );
    expect(result.isError).toBe(false);
    expect(result.data).toEqual({
      ok: true,
      invitedEmail: 'jane@example.com',
      fullName: 'Jane Doe',
    });
  });

  it('rejects an invalid email before calling the use case', async () => {
    const result = await registry.execute(
      { id: 'c1', name: 'register_member', input: { email: 'not-an-email', full_name: 'Jane', plan_id: 'p1' } },
      ctx,
    );
    expect(registerMember.execute).not.toHaveBeenCalled();
    expect(result).toMatchObject({ isError: true });
  });

  it('requires plan_id or expiry_date for register_member', async () => {
    const result = await registry.execute(
      { id: 'c1', name: 'register_member', input: { email: 'jane@example.com', full_name: 'Jane' } },
      ctx,
    );
    expect(registerMember.execute).not.toHaveBeenCalled();
    expect(result).toMatchObject({ isError: true });
  });

  it('surfaces a permission error from the use case as an error tool_result (not a throw)', async () => {
    registerMember.execute.mockRejectedValue(new ForbiddenError('Missing permission: members.create', 'PERMISSION_DENIED'));

    const result = await registry.execute(
      { id: 'c1', name: 'register_member', input: { email: 'jane@example.com', full_name: 'Jane', plan_id: 'p1' } },
      ctx,
    );

    expect(result).toMatchObject({ isError: true });
    expect(result.content.type === 'tool_result' && result.content.content).toContain('members.create');
  });

  it('routes suspend_member with member_id and caller', async () => {
    suspendMember.execute.mockResolvedValue({} as never);
    await registry.execute({ id: 'c1', name: 'suspend_member', input: { member_id: 'm-1' } }, ctx);
    expect(suspendMember.execute).toHaveBeenCalledWith('gym-1', 'm-1', caller);
  });

  it('lists only active plans with slimmed fields', async () => {
    plansRepo.listByGym.mockResolvedValue([
      { id: 'p1', name: 'Monthly', price: 500, durationDays: 30, isActive: true },
      { id: 'p2', name: 'Old', price: 100, durationDays: 30, isActive: false },
    ] as never);

    const result = await registry.execute({ id: 'c1', name: 'list_membership_plans', input: {} }, ctx);
    expect(result.data).toEqual([{ id: 'p1', name: 'Monthly', price: 500, durationDays: 30 }]);
  });
});

describe('ToolRegistry revenue tools', () => {
  const staffCtx: ToolContext = { gymId: 'gym-1', caller: { ...caller, permissions: ['insights.query'] } };
  const ownerCtx: ToolContext = { gymId: 'gym-1', caller: { ...caller, permissions: ['insights.query', 'reports.view'] } };
  const revenue = { id: 't1', name: 'query_metric', input: { entity: 'renewals', metric: 'sum', field: 'amount' } };

  beforeEach(() => {
    (repo.runMetric as jest.Mock).mockResolvedValue({ value: 12000 });
    (repo.runTrend as jest.Mock).mockResolvedValue([]);
  });

  it('refuses revenue totals for staff without reports.view', async () => {
    const result = await makeRegistry().execute(revenue, staffCtx);
    expect(result.isError).toBe(true);
    expect(repo.runMetric).not.toHaveBeenCalled();
  });

  it('refuses a revenue trend for staff', async () => {
    const result = await makeRegistry().execute(
      { id: 't2', name: 'get_trend', input: { entity: 'renewals', granularity: 'month', field: 'amount' } },
      staffCtx,
    );
    expect(result.isError).toBe(true);
    expect(repo.runTrend).not.toHaveBeenCalled();
  });

  it('still lets staff count renewals', async () => {
    const result = await makeRegistry().execute({ id: 't3', name: 'query_metric', input: { entity: 'renewals', metric: 'count' } }, staffCtx);
    expect(result.isError).toBe(false);
  });

  it('answers revenue for the owner', async () => {
    const result = await makeRegistry().execute(revenue, ownerCtx);
    expect(result).toMatchObject({ isError: false, data: { value: 12000 } });
  });
});
