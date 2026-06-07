import { Module } from '@nestjs/common';
import { CronLockService } from './shared/cron-lock.service';
import { MembershipExpiryJob } from './jobs/membership-expiry.job';
import { AutoSuspendJob } from './jobs/auto-suspend.job';
import { AutoCheckoutJob } from './jobs/auto-checkout.job';
import { AnnouncementPublisherJob } from './jobs/announcement-publisher.job';

@Module({
  providers: [
    CronLockService,
    MembershipExpiryJob,
    AutoSuspendJob,
    AutoCheckoutJob,
    AnnouncementPublisherJob,
  ],
})
export class CronModule {}
