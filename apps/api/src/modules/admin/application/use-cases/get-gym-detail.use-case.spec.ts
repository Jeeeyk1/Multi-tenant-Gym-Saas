import { GetGymDetailUseCase } from './get-gym-detail.use-case';
import type { AdminRepository } from '../../infrastructure/persistence/admin.repository';
import { NotFoundError } from '../../../../common/errors';
import { SubscriptionStatus } from '../../../../common/enums';

const repo = {
  getGymById: jest.fn(),
  countActiveMembers: jest.fn(),
} as unknown as jest.Mocked<AdminRepository>;

function baseGym(overrides: Record<string, unknown> = {}) {
  return {
    id: 'gym-1',
    name: 'Test Gym',
    organization: {
      id: 'org-1',
      name: 'Test Org',
      slug: 'test-org',
      members: [{ user: { emailVerifiedAt: new Date() } }],
      subscriptions: [],
    },
    ...overrides,
  } as never;
}

describe('GetGymDetailUseCase', () => {
  let useCase: GetGymDetailUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new GetGymDetailUseCase(repo);
  });

  it('throws when the gym does not exist', async () => {
    repo.getGymById.mockResolvedValue(null as never);
    await expect(useCase.execute('gym-1')).rejects.toThrow(NotFoundError);
  });

  it('returns the plan cap and active member count for an ACTIVE subscription', async () => {
    repo.getGymById.mockResolvedValue(
      baseGym({
        organization: {
          id: 'org-1',
          name: 'Test Org',
          slug: 'test-org',
          members: [{ user: { emailVerifiedAt: new Date() } }],
          subscriptions: [
            {
              status: SubscriptionStatus.ACTIVE,
              currentPeriodEnd: new Date(),
              plan: { maxMembersPerGym: 150 },
            },
          ],
        },
      }),
    );
    repo.countActiveMembers.mockResolvedValue(92);

    const result = await useCase.execute('gym-1');

    expect(result.activeMemberCount).toBe(92);
    expect(result.memberCap).toBe(150);
  });

  it('returns an unlimited cap (null) while TRIALING, regardless of the plan cap', async () => {
    repo.getGymById.mockResolvedValue(
      baseGym({
        organization: {
          id: 'org-1',
          name: 'Test Org',
          slug: 'test-org',
          members: [{ user: { emailVerifiedAt: new Date() } }],
          subscriptions: [
            {
              status: SubscriptionStatus.TRIALING,
              currentPeriodEnd: new Date(),
              plan: { maxMembersPerGym: 150 },
            },
          ],
        },
      }),
    );
    repo.countActiveMembers.mockResolvedValue(400);

    const result = await useCase.execute('gym-1');

    expect(result.memberCap).toBeNull();
    expect(result.activeMemberCount).toBe(400);
  });

  it('treats the -1 "unlimited" sentinel from an enterprise plan as null', async () => {
    repo.getGymById.mockResolvedValue(
      baseGym({
        organization: {
          id: 'org-1',
          name: 'Test Org',
          slug: 'test-org',
          members: [{ user: { emailVerifiedAt: new Date() } }],
          subscriptions: [
            {
              status: SubscriptionStatus.ACTIVE,
              currentPeriodEnd: new Date(),
              plan: { maxMembersPerGym: -1 },
            },
          ],
        },
      }),
    );
    repo.countActiveMembers.mockResolvedValue(500);

    const result = await useCase.execute('gym-1');

    expect(result.memberCap).toBeNull();
  });

  it('returns a null cap when the gym has no subscription at all', async () => {
    repo.getGymById.mockResolvedValue(baseGym());
    repo.countActiveMembers.mockResolvedValue(0);

    const result = await useCase.execute('gym-1');

    expect(result.subscription).toBeNull();
    expect(result.memberCap).toBeNull();
  });
});
