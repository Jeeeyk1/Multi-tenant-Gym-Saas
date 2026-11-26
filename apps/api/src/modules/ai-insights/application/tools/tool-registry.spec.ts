import { ToolRegistry, type ToolContext } from './tool-registry';
import type { InsightsRepository } from '../../infrastructure/persistence/insights.repository';
import type { MembershipPlansRepository } from '../../../membership-plans/infrastructure/persistence/membership-plans.repository';
import type { AuthenticatedUser } from '../../../../common/types/auth.types';

const repo = { findMembers: jest.fn(), runMetric: jest.fn(), runTrend: jest.fn() } as unknown as jest.Mocked<InsightsRepository>;
const plansRepo = { listByGym: jest.fn() } as unknown as jest.Mocked<MembershipPlansRepository>;

const caller: AuthenticatedUser = {
  type: 'gym',
  sub: 'staff-1',
  gymId: 'gym-1',
  roles: ['MANAGER'],
  permissions: ['insights.query', 'members.create'],
};
const ctx: ToolContext = { gymId: 'gym-1', caller };

function makeRegistry() {
  return new ToolRegistry(repo, plansRepo);
}

describe('ToolRegistry read tools', () => {
  let registry: ToolRegistry;

  beforeEach(() => {
    jest.clearAllMocks();
    registry = makeRegistry();
  });

  it('does not offer or run action tools (those go through ActionTools)', async () => {
    expect(registry.schemas().map((schema) => schema.name)).not.toContain('suspend_member');
    const result = await registry.execute({ id: 'c1', name: 'suspend_member', input: { member_id: 'm-1' } }, ctx);
    expect(result.isError).toBe(true);
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
