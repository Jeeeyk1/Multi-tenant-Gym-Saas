import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../common/prisma/prisma.service';

@Injectable()
export class NotificationsRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Returns active members who have not checked in for `inactiveDays` or more
   * and have at least one registered device token, excluding those who already
   * received the given notification type today.
   */
  async findInactiveMembersWithTokens(inactiveDays: number, notificationType: string) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - inactiveDays);
    cutoff.setHours(0, 0, 0, 0);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const members = await this.prisma.gymMember.findMany({
      where: {
        status: 'ACTIVE',
        user: {
          deviceTokens: { some: {} },
          notificationLogs: {
            none: {
              type: notificationType,
              sentDate: { gte: today, lt: tomorrow },
            },
          },
        },
        OR: [
          { checkIns: { none: {} } },
          {
            checkIns: {
              none: { checkedInAt: { gte: cutoff } },
            },
          },
        ],
      },
      select: {
        user: {
          select: {
            id: true,
            fullName: true,
            deviceTokens: { select: { token: true } },
          },
        },
      },
    });

    return members.map((m) => ({
      userId: m.user.id,
      fullName: m.user.fullName,
      tokens: m.user.deviceTokens.map((t) => t.token),
    }));
  }

  /**
   * Returns active members whose membership expires exactly `daysUntilExpiry`
   * days from today, who have at least one registered device token, and have
   * not received the given notification type today.
   */
  async findMembersExpiringSoonWithTokens(
    daysUntilExpiry: number,
    notificationType: string,
  ) {
    const target = new Date();
    target.setDate(target.getDate() + daysUntilExpiry);
    target.setHours(0, 0, 0, 0);
    const dayAfter = new Date(target);
    dayAfter.setDate(dayAfter.getDate() + 1);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const members = await this.prisma.gymMember.findMany({
      where: {
        status: 'ACTIVE',
        expiryDate: { gte: target, lt: dayAfter },
        user: {
          deviceTokens: { some: {} },
          notificationLogs: {
            none: {
              type: notificationType,
              sentDate: { gte: today, lt: tomorrow },
            },
          },
        },
      },
      select: {
        expiryDate: true,
        user: {
          select: {
            id: true,
            fullName: true,
            deviceTokens: { select: { token: true } },
          },
        },
      },
    });

    return members.map((m) => ({
      userId: m.user.id,
      fullName: m.user.fullName,
      expiryDate: m.expiryDate,
      tokens: m.user.deviceTokens.map((t) => t.token),
    }));
  }

  async logNotification(userId: string, type: string): Promise<void> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    await this.prisma.notificationLog.upsert({
      where: { userId_type_sentDate: { userId, type, sentDate: today } },
      create: { userId, type, sentDate: today },
      update: { sentAt: new Date() },
    });
  }
}
