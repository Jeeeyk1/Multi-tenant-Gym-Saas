import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { CronLockService } from '../shared/cron-lock.service';
import { CRON_LOCK_TTL, CRON_SCHEDULE } from '../../config/cron.config';
import { BillingRepository } from '../../modules/billing/infrastructure/persistence/billing.repository';
import { EmailService } from '../../common/email/email.service';
import { BillingCycle } from '../../common/enums';

const LOCK_KEY = 'lock:cron:generate-renewal-invoices';

@Injectable()
export class GenerateRenewalInvoicesJob {
  private readonly logger = new Logger(GenerateRenewalInvoicesJob.name);

  constructor(
    private readonly billing: BillingRepository,
    private readonly email: EmailService,
    private readonly lock: CronLockService,
  ) {}

  @Cron(CRON_SCHEDULE.RENEWAL_INVOICES)
  async run(): Promise<void> {
    await this.lock.withLock(LOCK_KEY, CRON_LOCK_TTL.RENEWAL_INVOICES, async () => {
      this.logger.log('started');
      const start = Date.now();
      let created = 0;

      try {
        const candidates = await this.billing.listSubscriptionsDueForRenewalInvoice();

        for (const sub of candidates) {
          // Idempotency — a renewal invoice (or the original first invoice, if still unpaid)
          // may already exist for this subscription; don't double-issue.
          const hasUnpaid = await this.billing.hasUnpaidInvoice(sub.id);
          if (hasUnpaid) continue;

          const amount =
            sub.billingCycle === BillingCycle.YEARLY
              ? (sub.plan.priceYearly ?? sub.plan.priceMonthly)
              : sub.plan.priceMonthly;

          await this.billing.createRenewalInvoice(sub.id, sub.organizationId, amount, sub.currentPeriodEnd);
          created++;

          const owner = sub.organization.members[0]?.user;
          if (owner) {
            await this.email.sendRenewalReminder({
              to: owner.email,
              fullName: owner.fullName,
              gymName: sub.organization.name,
              amount: `₱${Number(amount).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`,
              dueAt: sub.currentPeriodEnd.toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' }),
            });
          }
        }

        this.logger.log(`created ${created} renewal invoices in ${Date.now() - start}ms`);
      } catch (err) {
        this.logger.error('failed', err instanceof Error ? err.message : String(err));
      }

      this.logger.log('completed');
    });
  }
}
