import { MarkSubscriptionsPastDueJob } from './mark-subscriptions-past-due.job';
import type { CronLockService } from '../shared/cron-lock.service';
import type { BillingRepository } from '../../modules/billing/infrastructure/persistence/billing.repository';

function makeLock(acquired = true): jest.Mocked<CronLockService> {
  return {
    withLock: jest.fn(async (_key, _ttl, fn) => {
      if (acquired) await fn();
    }),
  } as unknown as jest.Mocked<CronLockService>;
}

const billing = {
  listActiveSubscriptionsPastPeriodEnd: jest.fn(),
  markPastDue: jest.fn(),
} as unknown as jest.Mocked<BillingRepository>;

describe('MarkSubscriptionsPastDueJob', () => {
  beforeEach(() => jest.clearAllMocks());

  it('marks every overdue ACTIVE subscription PAST_DUE', async () => {
    billing.listActiveSubscriptionsPastPeriodEnd.mockResolvedValue([
      { id: 'sub-1', organizationId: 'org-1' },
      { id: 'sub-2', organizationId: 'org-2' },
    ] as never);

    const job = new MarkSubscriptionsPastDueJob(billing, makeLock());
    await job.run();

    expect(billing.markPastDue).toHaveBeenCalledWith('sub-1');
    expect(billing.markPastDue).toHaveBeenCalledWith('sub-2');
    expect(billing.markPastDue).toHaveBeenCalledTimes(2);
  });

  it('skips all db work when lock is already held', async () => {
    const job = new MarkSubscriptionsPastDueJob(billing, makeLock(false));
    await job.run();
    expect(billing.listActiveSubscriptionsPastPeriodEnd).not.toHaveBeenCalled();
  });

  it('does nothing when no subscriptions are overdue', async () => {
    billing.listActiveSubscriptionsPastPeriodEnd.mockResolvedValue([] as never);
    const job = new MarkSubscriptionsPastDueJob(billing, makeLock());
    await job.run();
    expect(billing.markPastDue).not.toHaveBeenCalled();
  });
});
