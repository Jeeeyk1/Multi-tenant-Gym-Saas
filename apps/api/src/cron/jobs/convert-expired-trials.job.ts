import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { CronLockService } from '../shared/cron-lock.service';
import { CRON_LOCK_TTL, CRON_SCHEDULE } from '../../config/cron.config';
import { BillingRepository } from '../../modules/billing/infrastructure/persistence/billing.repository';
import { CacheService } from '../../common/cache/cache.service';
import { EmailService } from '../../common/email/email.service';
import { BillingCycle } from '../../common/enums';
import { addDays, FIRST_INVOICE_DUE_DAYS } from '../../modules/billing/domain/billing.constants';

const LOCK_KEY = 'lock:cron:convert-expired-trials';

/**
 * Lapsed TRIALING subscriptions → issue the first invoice + flip to PENDING_PAYMENT
 * (which locks the gym via the guard) and email the owner. The status flip removes
 * the subscription from the TRIALING query, so re-runs are naturally idempotent.
 */
@Injectable()
export class ConvertExpiredTrialsJob {
  private readonly logger = new Logger(ConvertExpiredTrialsJob.name);

  constructor(
    private readonly billing: BillingRepository,
    private readonly cache: CacheService,
    private readonly email: EmailService,
    private readonly lock: CronLockService,
  ) {}

  @Cron(CRON_SCHEDULE.TRIAL_CONVERSION)
  async run(): Promise<void> {
    await this.lock.withLock(LOCK_KEY, CRON_LOCK_TTL.TRIAL_CONVERSION, async () => {
      this.logger.log('started');
      const start = Date.now();
      let converted = 0;

      try {
        const expired = await this.billing.listExpiredTrials();

        for (const sub of expired) {
          const amount =
            sub.billingCycle === BillingCycle.YEARLY
              ? (sub.plan.priceYearly ?? sub.plan.priceMonthly)
              : sub.plan.priceMonthly;

          const dueAt = addDays(new Date(), FIRST_INVOICE_DUE_DAYS);
          const gymIds = await this.billing.convertExpiredTrial(sub.id, sub.organizationId, amount, dueAt);
          await Promise.all(gymIds.map((gymId) => this.cache.del(`sub:status:${gymId}`)));
          converted++;

          const owner = sub.organization.members[0]?.user;
          if (owner) {
            await this.email.sendRenewalReminder({
              to: owner.email,
              fullName: owner.fullName,
              gymName: sub.organization.name,
              amount: `₱${Number(amount).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`,
              dueAt: dueAt.toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' }),
            });
          }
        }

        this.logger.log(`converted ${converted} expired trials in ${Date.now() - start}ms`);
      } catch (err) {
        this.logger.error('failed', err instanceof Error ? err.message : String(err));
      }

      this.logger.log('completed');
    });
  }
}
