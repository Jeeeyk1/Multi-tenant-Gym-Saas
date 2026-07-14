import { SuspendOverdueSubscriptionsJob } from './suspend-overdue-subscriptions.job';
import type { CronLockService } from '../shared/cron-lock.service';
import type { BillingRepository } from '../../modules/billing/infrastructure/persistence/billing.repository';
import type { CacheService } from '../../common/cache/cache.service';
import type { EmailService } from '../../common/email/email.service';

function makeLock(acquired = true): jest.Mocked<CronLockService> {
  return {
    withLock: jest.fn(async (_key, _ttl, fn) => {
      if (acquired) await fn();
    }),
  } as unknown as jest.Mocked<CronLockService>;
}

const billing = {
  listPastDueSubscriptionsPastGrace: jest.fn(),
  markSuspended: jest.fn(),
} as unknown as jest.Mocked<BillingRepository>;

const cache = { del: jest.fn() } as unknown as jest.Mocked<CacheService>;
const email = { sendSubscriptionSuspended: jest.fn() } as unknown as jest.Mocked<EmailService>;

describe('SuspendOverdueSubscriptionsJob', () => {
  let job: SuspendOverdueSubscriptionsJob;

  beforeEach(() => {
    jest.clearAllMocks();
    job = new SuspendOverdueSubscriptionsJob(billing, cache, email, makeLock());
  });

  it('suspends the subscription, busts the status cache, and emails the owner', async () => {
    billing.listPastDueSubscriptionsPastGrace.mockResolvedValue([
      {
        id: 'sub-1',
        organizationId: 'org-1',
        organization: { name: 'Iron Paradise', members: [{ user: { email: 'owner@example.com', fullName: 'Juan' } }] },
      },
    ] as never);
    billing.markSuspended.mockResolvedValue(['gym-1', 'gym-2'] as never);

    await job.run();

    expect(billing.markSuspended).toHaveBeenCalledWith('sub-1', 'org-1');
    expect(cache.del).toHaveBeenCalledWith('sub:status:gym-1');
    expect(cache.del).toHaveBeenCalledWith('sub:status:gym-2');
    expect(email.sendSubscriptionSuspended).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'owner@example.com', gymName: 'Iron Paradise' }),
    );
  });

  it('skips all db work when lock is already held', async () => {
    job = new SuspendOverdueSubscriptionsJob(billing, cache, email, makeLock(false));
    await job.run();
    expect(billing.listPastDueSubscriptionsPastGrace).not.toHaveBeenCalled();
  });

  it('does nothing when no subscriptions are past grace', async () => {
    billing.listPastDueSubscriptionsPastGrace.mockResolvedValue([] as never);
    await job.run();
    expect(billing.markSuspended).not.toHaveBeenCalled();
  });
});
