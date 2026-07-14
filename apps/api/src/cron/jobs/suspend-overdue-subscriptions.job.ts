import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { CronLockService } from '../shared/cron-lock.service';
import { CRON_LOCK_TTL, CRON_SCHEDULE } from '../../config/cron.config';
import { BillingRepository } from '../../modules/billing/infrastructure/persistence/billing.repository';
import { CacheService } from '../../common/cache/cache.service';
import { EmailService } from '../../common/email/email.service';

const LOCK_KEY = 'lock:cron:suspend-overdue-subscriptions';

/** PAST_DUE subscriptions past their grace window → SUSPENDED (locks the gym via the guard). */
@Injectable()
export class SuspendOverdueSubscriptionsJob {
  private readonly logger = new Logger(SuspendOverdueSubscriptionsJob.name);

  constructor(
    private readonly billing: BillingRepository,
    private readonly cache: CacheService,
    private readonly email: EmailService,
    private readonly lock: CronLockService,
  ) {}

  @Cron(CRON_SCHEDULE.SUBSCRIPTION_SUSPEND)
  async run(): Promise<void> {
    await this.lock.withLock(LOCK_KEY, CRON_LOCK_TTL.SUBSCRIPTION_SUSPEND, async () => {
      this.logger.log('started');
      const start = Date.now();
      let suspended = 0;

      try {
        const overdue = await this.billing.listPastDueSubscriptionsPastGrace();

        for (const sub of overdue) {
          const gymIds = await this.billing.markSuspended(sub.id, sub.organizationId);
          await Promise.all(gymIds.map((gymId) => this.cache.del(`sub:status:${gymId}`)));
          suspended++;

          const owner = sub.organization.members[0]?.user;
          if (owner) {
            await this.email.sendSubscriptionSuspended({
              to: owner.email,
              fullName: owner.fullName,
              gymName: sub.organization.name,
            });
          }
        }

        this.logger.log(`suspended ${suspended} subscriptions in ${Date.now() - start}ms`);
      } catch (err) {
        this.logger.error('failed', err instanceof Error ? err.message : String(err));
      }

      this.logger.log('completed');
    });
  }
}
