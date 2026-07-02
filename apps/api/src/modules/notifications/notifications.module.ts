import { Module } from '@nestjs/common';
import { NotificationsRepository } from './infrastructure/persistence/notifications.repository';
import { AttendanceReminderJob } from './jobs/attendance-reminder.job';
import { MembershipExpiryWarningJob } from './jobs/membership-expiry-warning.job';

@Module({
  providers: [NotificationsRepository, AttendanceReminderJob, MembershipExpiryWarningJob],
})
export class NotificationsModule {}
