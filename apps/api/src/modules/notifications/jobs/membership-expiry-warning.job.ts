import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import Expo, { type ExpoPushMessage } from 'expo-server-sdk';
import { NotificationsRepository } from '../infrastructure/persistence/notifications.repository';

const NOTIFICATION_TYPE = 'MEMBERSHIP_EXPIRY_WARNING';
const DAYS_BEFORE_EXPIRY = 5;

@Injectable()
export class MembershipExpiryWarningJob {
  private readonly logger = new Logger(MembershipExpiryWarningJob.name);
  private readonly expo = new Expo();

  constructor(private readonly notificationsRepository: NotificationsRepository) {}

  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async run(): Promise<void> {
    this.logger.log('Running membership expiry warning job…');

    const targets = await this.notificationsRepository.findMembersExpiringSoonWithTokens(
      DAYS_BEFORE_EXPIRY,
      NOTIFICATION_TYPE,
    );

    if (targets.length === 0) {
      this.logger.log('No members with imminent expiry to notify.');
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
          title: 'Your membership expires soon ⏳',
          body: `Hey ${target.fullName.split(' ')[0]}, your membership ends in ${DAYS_BEFORE_EXPIRY} days. Tap to view details.`,
          data: { type: NOTIFICATION_TYPE, screen: 'membership' },
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

    const notifiedUserIds = new Set(targets.map((t) => t.userId));
    await Promise.all(
      [...notifiedUserIds].map((userId) =>
        this.notificationsRepository.logNotification(userId, NOTIFICATION_TYPE),
      ),
    );

    this.logger.log(`Membership expiry warnings sent to ${notifiedUserIds.size} users.`);
  }
}
