import { Module } from '@nestjs/common';
import { NotificationsRepository } from './infrastructure/persistence/notifications.repository';
import { AttendanceReminderJob } from './jobs/attendance-reminder.job';

@Module({
  providers: [NotificationsRepository, AttendanceReminderJob],
})
export class NotificationsModule {}
