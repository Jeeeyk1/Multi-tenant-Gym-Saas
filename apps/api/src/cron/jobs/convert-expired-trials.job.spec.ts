import { ConvertExpiredTrialsJob } from './convert-expired-trials.job';
import type { CronLockService } from '../shared/cron-lock.service';
import type { BillingRepository } from '../../modules/billing/infrastructure/persistence/billing.repository';
import type { CacheService } from '../../common/cache/cache.service';
import type { EmailService } from '../../common/email/email.service';
import { BillingCycle } from '../../common/enums';

function makeLock(acquired = true): jest.Mocked<CronLockService> {
  return {
    withLock: jest.fn(async (_key, _ttl, fn) => {
      if (acquired) await fn();
    }),
  } as unknown as jest.Mocked<CronLockService>;
}

const billing = {
  listExpiredTrials: jest.fn(),
  convertExpiredTrial: jest.fn(),
} as unknown as jest.Mocked<BillingRepository>;

const cache = { del: jest.fn() } as unknown as jest.Mocked<CacheService>;
const email = { sendRenewalReminder: jest.fn() } as unknown as jest.Mocked<EmailService>;

function expiredTrial(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'sub-1',
    organizationId: 'org-1',
    billingCycle: BillingCycle.MONTHLY,
    plan: { priceMonthly: 1299, priceYearly: 12990 },
    organization: { name: 'Iron Paradise', members: [{ user: { email: 'owner@example.com', fullName: 'Juan' } }] },
    ...overrides,
  };
}

describe('ConvertExpiredTrialsJob', () => {
  let job: ConvertExpiredTrialsJob;

  beforeEach(() => {
    jest.clearAllMocks();
    job = new ConvertExpiredTrialsJob(billing, cache, email, makeLock());
  });

  it('issues an invoice, locks the gym, busts cache, and emails the owner', async () => {
    billing.listExpiredTrials.mockResolvedValue([expiredTrial()] as never);
    billing.convertExpiredTrial.mockResolvedValue(['gym-1', 'gym-2'] as never);

    await job.run();

    expect(billing.convertExpiredTrial).toHaveBeenCalledWith('sub-1', 'org-1', 1299, expect.any(Date));
    expect(cache.del).toHaveBeenCalledWith('sub:status:gym-1');
    expect(cache.del).toHaveBeenCalledWith('sub:status:gym-2');
    expect(email.sendRenewalReminder).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'owner@example.com', gymName: 'Iron Paradise' }),
    );
  });

  it('uses the yearly price for a yearly trial', async () => {
    billing.listExpiredTrials.mockResolvedValue([expiredTrial({ billingCycle: BillingCycle.YEARLY })] as never);
    billing.convertExpiredTrial.mockResolvedValue(['gym-1'] as never);

    await job.run();

    expect(billing.convertExpiredTrial).toHaveBeenCalledWith('sub-1', 'org-1', 12990, expect.any(Date));
  });

  it('does no work when the lock is already held', async () => {
    job = new ConvertExpiredTrialsJob(billing, cache, email, makeLock(false));
    await job.run();
    expect(billing.listExpiredTrials).not.toHaveBeenCalled();
  });
});
