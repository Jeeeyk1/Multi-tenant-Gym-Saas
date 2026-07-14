import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { CronLockService } from '../shared/cron-lock.service';
import { CRON_LOCK_TTL, CRON_SCHEDULE } from '../../config/cron.config';
import { BillingRepository } from '../../modules/billing/infrastructure/persistence/billing.repository';

const LOCK_KEY = 'lock:cron:mark-subscriptions-past-due';

/** ACTIVE subscriptions whose period ended unpaid → PAST_DUE (grace window, still usable). */
@Injectable()
export class MarkSubscriptionsPastDueJob {
  private readonly logger = new Logger(MarkSubscriptionsPastDueJob.name);

  constructor(
    private readonly billing: BillingRepository,
    private readonly lock: CronLockService,
  ) {}

  @Cron(CRON_SCHEDULE.SUBSCRIPTION_PAST_DUE)
  async run(): Promise<void> {
    await this.lock.withLock(LOCK_KEY, CRON_LOCK_TTL.SUBSCRIPTION_PAST_DUE, async () => {
      this.logger.log('started');
      const start = Date.now();
      let updated = 0;

      try {
        const overdue = await this.billing.listActiveSubscriptionsPastPeriodEnd();
        for (const sub of overdue) {
          await this.billing.markPastDue(sub.id);
          updated++;
        }

        this.logger.log(`marked ${updated} subscriptions PAST_DUE in ${Date.now() - start}ms`);
      } catch (err) {
        this.logger.error('failed', err instanceof Error ? err.message : String(err));
      }

      this.logger.log('completed');
    });
  }
}
