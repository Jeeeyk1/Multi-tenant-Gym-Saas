import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import Expo, { type ExpoPushMessage } from 'expo-server-sdk';
import { NotificationsRepository } from '../infrastructure/persistence/notifications.repository';

const NOTIFICATION_TYPE = 'ATTENDANCE_REMINDER';
const INACTIVE_DAYS = 3;

@Injectable()
export class AttendanceReminderJob {
  private readonly logger = new Logger(AttendanceReminderJob.name);
  private readonly expo = new Expo();

  constructor(private readonly notificationsRepository: NotificationsRepository) {}

  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async run(): Promise<void> {
    this.logger.log('Running attendance reminder job…');

    const targets = await this.notificationsRepository.findInactiveMembersWithTokens(
      INACTIVE_DAYS,
      NOTIFICATION_TYPE,
    );

    if (targets.length === 0) {
      this.logger.log('No inactive members to notify.');
      return;
    }

    const messages: ExpoPushMessage[] = [];

    for (const target of targets) {
      for (const token of target.tokens) {
        if (!Expo.isExpoPushToken(token)) {
          this.logger.warn(`Invalid Expo push token for user ${target.userId}: ${token}`);
          continue;
        }
        messages.push({
          to: token,
          title: "We miss you! 💪",
          body: `Hey ${target.fullName.split(' ')[0]}, it's been a while. Come train today!`,
          data: { type: NOTIFICATION_TYPE },
        });
      }
    }

    if (messages.length === 0) {
      this.logger.log('No valid tokens to send to.');
      return;
    }

    const chunks = this.expo.chunkPushNotifications(messages);

    for (const chunk of chunks) {
      try {
        const receipts = await this.expo.sendPushNotificationsAsync(chunk);
        this.logger.log(`Sent chunk: ${receipts.length} receipts`);
      } catch (err) {
        this.logger.error('Failed to send push chunk', err);
      }
    }

    // Log sends to prevent duplicates today
    const notifiedUserIds = new Set(targets.map((t) => t.userId));
    await Promise.all(
      [...notifiedUserIds].map((userId) =>
        this.notificationsRepository.logNotification(userId, NOTIFICATION_TYPE),
      ),
    );

    this.logger.log(`Attendance reminders sent to ${notifiedUserIds.size} users.`);
  }
}
