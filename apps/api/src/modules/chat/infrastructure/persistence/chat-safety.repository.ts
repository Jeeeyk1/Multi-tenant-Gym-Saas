import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../common/prisma/prisma.service';
import { MessageReportStatus } from '../../../../common/enums';

/** Reports, blocks and rules acceptance for community chat. */
@Injectable()
export class ChatSafetyRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** A message in one of this gym's conversations, with what's needed to report or moderate it. */
  findMessageInGym(messageId: string, gymId: string) {
    return this.prisma.message.findFirst({
      where: { id: messageId, conversation: { gymId } },
      select: {
        id: true,
        senderId: true,
        isDeleted: true,
        conversationId: true,
        conversation: { select: { type: true } },
      },
    });
  }

  isConversationMember(conversationId: string, userId: string) {
    return this.prisma.conversationMember
      .count({ where: { conversationId, userId } })
      .then((count) => count > 0);
  }

  /** False when this person already reported the message (reporting again changes nothing). */
  async createReport(input: { gymId: string; messageId: string; reporterUserId: string; reason: string; note?: string }) {
    try {
      await this.prisma.messageReport.create({ data: input });
      return true;
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') return false;
      throw err;
    }
  }

  /**
   * One page of the moderation queue: messages with open reports, most recently reported first,
   * with their full report count (grouped in SQL, so counts are right however many there are).
   */
  async openReportQueue(gymId: string, page: { skip: number; take: number }) {
    const where = { gymId, status: MessageReportStatus.OPEN };
    const [groups, totals] = await Promise.all([
      this.prisma.messageReport.groupBy({
        by: ['messageId'],
        where,
        _count: { _all: true },
        _max: { createdAt: true },
        orderBy: { _max: { createdAt: 'desc' } },
        skip: page.skip,
        take: page.take,
      }),
      this.prisma.messageReport.groupBy({ by: ['messageId'], where }),
    ]);
    const messageIds = groups.map((group) => group.messageId);
    const [messages, reports] = await Promise.all([
      this.prisma.message.findMany({
        where: { id: { in: messageIds } },
        select: {
          id: true,
          content: true,
          isDeleted: true,
          sentAt: true,
          sender: { select: { id: true, fullName: true } },
          conversation: { select: { id: true, name: true, type: true } },
        },
      }),
      this.prisma.messageReport.findMany({
        where: { ...where, messageId: { in: messageIds } },
        orderBy: { createdAt: 'desc' },
        select: {
          messageId: true,
          reason: true,
          note: true,
          createdAt: true,
          reporter: { select: { id: true, fullName: true } },
        },
      }),
    ]);
    return { groups, totalMessages: totals.length, messages, reports };
  }

  /** Closes every open report on a message. Returns how many were closed. */
  async resolveReports(gymId: string, messageId: string, status: MessageReportStatus, reviewerId: string) {
    const { count } = await this.prisma.messageReport.updateMany({
      where: { gymId, messageId, status: MessageReportStatus.OPEN },
      data: { status, reviewedByUserId: reviewerId, reviewedAt: new Date() },
    });
    return count;
  }

  /**
   * Removes a reported message and closes its open reports together, so a failure can't leave
   * reports marked "removed" on a message that's still visible. Returns how many reports closed.
   */
  removeReportedMessage(gymId: string, messageId: string, reviewerId: string): Promise<number> {
    return this.prisma.$transaction(async (tx) => {
      const { count } = await tx.messageReport.updateMany({
        where: { gymId, messageId, status: MessageReportStatus.OPEN },
        data: { status: MessageReportStatus.REMOVED, reviewedByUserId: reviewerId, reviewedAt: new Date() },
      });
      if (count > 0) await tx.message.update({ where: { id: messageId }, data: { isDeleted: true, content: null } });
      return count;
    });
  }

  /** Someone who uses chat or belongs to this gym (members, staff), so blocks can't probe other gyms' users. */
  async isPersonInGym(gymId: string, userId: string): Promise<boolean> {
    const [members, staff] = await Promise.all([
      this.prisma.gymMember.count({ where: { gymId, userId } }),
      this.prisma.gymStaff.count({ where: { gymId, userId } }),
    ]);
    return members + staff > 0;
  }

  async block(blockerUserId: string, blockedUserId: string) {
    await this.prisma.userBlock.upsert({
      where: { blockerUserId_blockedUserId: { blockerUserId, blockedUserId } },
      create: { blockerUserId, blockedUserId },
      update: {},
    });
  }

  async unblock(blockerUserId: string, blockedUserId: string) {
    await this.prisma.userBlock.deleteMany({ where: { blockerUserId, blockedUserId } });
  }

  listBlocks(blockerUserId: string) {
    return this.prisma.userBlock.findMany({
      where: { blockerUserId },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true, blocked: { select: { id: true, fullName: true } } },
    });
  }

  /** Ids this person blocked, to leave their messages out of the history. */
  blockedIds(blockerUserId: string): Promise<string[]> {
    return this.prisma.userBlock
      .findMany({ where: { blockerUserId }, select: { blockedUserId: true } })
      .then((rows) => rows.map((row) => row.blockedUserId));
  }

  /** Ids of people who blocked this sender, to leave them out of a live message. */
  blockerIds(blockedUserId: string): Promise<string[]> {
    return this.prisma.userBlock
      .findMany({ where: { blockedUserId }, select: { blockerUserId: true } })
      .then((rows) => rows.map((row) => row.blockerUserId));
  }

  rulesVersion(userId: string): Promise<number | null> {
    return this.prisma.user
      .findUnique({ where: { id: userId }, select: { communityRulesVersion: true } })
      .then((user) => user?.communityRulesVersion ?? null);
  }

  async acceptRules(userId: string, version: number) {
    await this.prisma.user.update({ where: { id: userId }, data: { communityRulesVersion: version, updatedAt: new Date() } });
  }
}
