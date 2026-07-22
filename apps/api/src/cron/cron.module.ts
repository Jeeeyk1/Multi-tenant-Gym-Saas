import { Module } from '@nestjs/common';
import { CronLockService } from './shared/cron-lock.service';
import { MembershipExpiryJob } from './jobs/membership-expiry.job';
import { AutoSuspendJob } from './jobs/auto-suspend.job';
import { AutoCheckoutJob } from './jobs/auto-checkout.job';
import { AnnouncementPublisherJob } from './jobs/announcement-publisher.job';
import { LeaderboardCycleJob } from './jobs/leaderboard-cycle.job';
import { GenerateRenewalInvoicesJob } from './jobs/generate-renewal-invoices.job';
import { MarkSubscriptionsPastDueJob } from './jobs/mark-subscriptions-past-due.job';
import { SuspendOverdueSubscriptionsJob } from './jobs/suspend-overdue-subscriptions.job';
import { ConvertExpiredTrialsJob } from './jobs/convert-expired-trials.job';
import { BadgesModule } from '../modules/badges/badges.module';
import { BillingModule } from '../modules/billing/billing.module';

@Module({
  imports: [BadgesModule, BillingModule],
  providers: [
    CronLockService,
    MembershipExpiryJob,
    AutoSuspendJob,
    AutoCheckoutJob,
    AnnouncementPublisherJob,
    LeaderboardCycleJob,
    GenerateRenewalInvoicesJob,
    MarkSubscriptionsPastDueJob,
    SuspendOverdueSubscriptionsJob,
    ConvertExpiredTrialsJob,
  ],
})
export class CronModule {}
