import { Injectable } from '@nestjs/common';
import { assertGymAccess, assertPermission } from '../../../../common/auth/authorization';
import { Permission } from '../../../../common/enums';
import type { AuthenticatedUser } from '../../../../common/types/auth.types';
import { ChatSafetyRepository } from '../../infrastructure/persistence/chat-safety.repository';

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

export interface ReportedMessage {
  messageId: string;
  conversation: { id: string; name: string | null; type: string };
  content: string | null;
  sender: { id: string; fullName: string };
  sentAt: Date;
  reportCount: number;
  latestReportAt: Date;
  reports: { reason: string; note: string | null; reporter: { id: string; fullName: string }; createdAt: Date }[];
}

export interface ReportQueuePage {
  data: ReportedMessage[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

/** The moderation queue: messages with open reports, the most recently reported first, a page at a time. */
@Injectable()
export class ListReportsUseCase {
  constructor(private readonly repo: ChatSafetyRepository) {}

  async execute(gymId: string, query: { page?: number; limit?: number }, caller: AuthenticatedUser): Promise<ReportQueuePage> {
    assertGymAccess(caller, gymId);
    assertPermission(caller, Permission.CHAT_MANAGE);

    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(MAX_LIMIT, Math.max(1, query.limit ?? DEFAULT_LIMIT));
    const { groups, totalMessages, messages, reports } = await this.repo.openReportQueue(gymId, {
      skip: (page - 1) * limit,
      take: limit,
    });

    const messageById = new Map(messages.map((message) => [message.id, message]));
    const data: ReportedMessage[] = [];
    for (const group of groups) {
      const message = messageById.get(group.messageId);
      if (!message) continue; // removed between the two reads
      data.push({
        messageId: message.id,
        conversation: message.conversation,
        content: message.isDeleted ? null : message.content,
        sender: message.sender,
        sentAt: message.sentAt,
        reportCount: group._count._all,
        latestReportAt: group._max.createdAt ?? message.sentAt,
        reports: reports
          .filter((report) => report.messageId === message.id)
          .map(({ reason, note, reporter, createdAt }) => ({ reason, note, reporter, createdAt })),
      });
    }
    return { data, meta: { total: totalMessages, page, limit, totalPages: Math.ceil(totalMessages / limit) } };
  }
}
