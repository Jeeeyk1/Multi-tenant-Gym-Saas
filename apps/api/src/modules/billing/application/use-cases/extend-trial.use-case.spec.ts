import { ExtendTrialUseCase } from './extend-trial.use-case';
import type { BillingRepository } from '../../infrastructure/persistence/billing.repository';
import type { CacheService } from '../../../../common/cache/cache.service';
import { ConflictError, NotFoundError } from '../../../../common/errors';
import { SubscriptionStatus } from '../../../../common/enums';

const billing = {
  getLatestSubscriptionByGym: jest.fn(),
  extendTrial: jest.fn(),
} as unknown as jest.Mocked<BillingRepository>;

const cache = { del: jest.fn() } as unknown as jest.Mocked<CacheService>;

const DAY = 24 * 60 * 60 * 1000;

describe('ExtendTrialUseCase', () => {
  let useCase: ExtendTrialUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new ExtendTrialUseCase(billing, cache);
  });

  it('throws when the gym has no subscription', async () => {
    billing.getLatestSubscriptionByGym.mockResolvedValue(null);
    await expect(useCase.execute('gym-1', 7)).rejects.toThrow(NotFoundError);
  });

  it('refuses to extend an ACTIVE subscription', async () => {
    billing.getLatestSubscriptionByGym.mockResolvedValue({
      id: 'sub-1',
      status: SubscriptionStatus.ACTIVE,
      currentPeriodEnd: new Date(Date.now() + 30 * DAY),
      organizationId: 'org-1',
    } as never);
    await expect(useCase.execute('gym-1', 7)).rejects.toThrow(ConflictError);
  });

  it('extends a running trial from its current end date and busts the cache', async () => {
    const end = new Date(Date.now() + 5 * DAY);
    billing.getLatestSubscriptionByGym.mockResolvedValue({
      id: 'sub-1',
      status: SubscriptionStatus.TRIALING,
      currentPeriodEnd: end,
      organizationId: 'org-1',
    } as never);
    billing.extendTrial.mockResolvedValue(['gym-1'] as never);

    const { trialEndsAt } = await useCase.execute('gym-1', 7);

    // 5 days remaining + 7 more ≈ 12 days out
    expect(trialEndsAt.getTime()).toBeGreaterThan(Date.now() + 11 * DAY);
    expect(billing.extendTrial).toHaveBeenCalledWith('sub-1', 'org-1', trialEndsAt);
    expect(cache.del).toHaveBeenCalledWith('sub:status:gym-1');
  });

  it('reopens a lapsed trial from now, not from the past end date', async () => {
    billing.getLatestSubscriptionByGym.mockResolvedValue({
      id: 'sub-1',
      status: SubscriptionStatus.PENDING_PAYMENT,
      currentPeriodEnd: new Date(Date.now() - 3 * DAY), // already lapsed
      organizationId: 'org-1',
    } as never);
    billing.extendTrial.mockResolvedValue(['gym-1'] as never);

    const { trialEndsAt } = await useCase.execute('gym-1', 7);

    // fresh 7-day window from now, not 7 days after a past date
    expect(trialEndsAt.getTime()).toBeGreaterThan(Date.now() + 6 * DAY);
  });
});
