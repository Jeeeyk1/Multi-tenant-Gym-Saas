import { GenerateRenewalInvoicesJob } from './generate-renewal-invoices.job';
import type { CronLockService } from '../shared/cron-lock.service';
import type { BillingRepository } from '../../modules/billing/infrastructure/persistence/billing.repository';
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
  listSubscriptionsDueForRenewalInvoice: jest.fn(),
  hasUnpaidInvoice: jest.fn(),
  createRenewalInvoice: jest.fn(),
} as unknown as jest.Mocked<BillingRepository>;

const email = { sendRenewalReminder: jest.fn() } as unknown as jest.Mocked<EmailService>;

function candidate(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'sub-1',
    organizationId: 'org-1',
    billingCycle: BillingCycle.MONTHLY,
    currentPeriodEnd: new Date('2026-07-15'),
    plan: { priceMonthly: 1299, priceYearly: 12990 },
    organization: { name: 'Iron Paradise', members: [{ user: { email: 'owner@example.com', fullName: 'Juan' } }] },
    ...overrides,
  };
}

describe('GenerateRenewalInvoicesJob', () => {
  let job: GenerateRenewalInvoicesJob;

  beforeEach(() => {
    jest.clearAllMocks();
    job = new GenerateRenewalInvoicesJob(billing, email, makeLock());
  });

  it('creates a renewal invoice and emails the owner when none is unpaid yet', async () => {
    billing.listSubscriptionsDueForRenewalInvoice.mockResolvedValue([candidate()] as never);
    billing.hasUnpaidInvoice.mockResolvedValue(false);

    await job.run();

    expect(billing.createRenewalInvoice).toHaveBeenCalledWith('sub-1', 'org-1', 1299, new Date('2026-07-15'));
    expect(email.sendRenewalReminder).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'owner@example.com', gymName: 'Iron Paradise' }),
    );
  });

  it('skips a subscription that already has an unpaid invoice (idempotency)', async () => {
    billing.listSubscriptionsDueForRenewalInvoice.mockResolvedValue([candidate()] as never);
    billing.hasUnpaidInvoice.mockResolvedValue(true);

    await job.run();

    expect(billing.createRenewalInvoice).not.toHaveBeenCalled();
    expect(email.sendRenewalReminder).not.toHaveBeenCalled();
  });

  it('skips all db work when lock is already held', async () => {
    job = new GenerateRenewalInvoicesJob(billing, email, makeLock(false));
    await job.run();
    expect(billing.listSubscriptionsDueForRenewalInvoice).not.toHaveBeenCalled();
  });
});
