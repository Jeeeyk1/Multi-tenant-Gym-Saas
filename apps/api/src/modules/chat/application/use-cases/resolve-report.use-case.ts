import { Injectable, Logger } from '@nestjs/common';
import { NotFoundError } from '../../../../common/errors';
import { assertGymAccess, assertPermission } from '../../../../common/auth/authorization';
import { MessageReportStatus, Permission, ReportAction } from '../../../../common/enums';
import type { AuthenticatedUser } from '../../../../common/types/auth.types';
import { ChatSafetyRepository } from '../../infrastructure/persistence/chat-safety.repository';
import { ChatSessionsService } from '../chat-sessions.service';

/** A moderator closes the open reports on a message: leave it (dismiss) or remove it. */
@Injectable()
export class ResolveReportUseCase {
  private readonly logger = new Logger(ResolveReportUseCase.name);

  constructor(
    private readonly safety: ChatSafetyRepository,
    private readonly sessions: ChatSessionsService,
  ) {}

  async execute(gymId: string, messageId: string, action: ReportAction, caller: AuthenticatedUser) {
    assertGymAccess(caller, gymId);
    assertPermission(caller, Permission.CHAT_MANAGE);

    const message = await this.safety.findMessageInGym(messageId, gymId);
    if (!message) throw new NotFoundError('Message not found', 'MESSAGE_NOT_FOUND');

    const remove = action === ReportAction.REMOVE;
    const status = remove ? MessageReportStatus.REMOVED : MessageReportStatus.DISMISSED;
    const closed = remove
      ? await this.safety.removeReportedMessage(gymId, messageId, caller.sub)
      : await this.safety.resolveReports(gymId, messageId, status, caller.sub);
    if (closed === 0) throw new NotFoundError('No open reports for this message', 'REPORT_NOT_FOUND');

    // Only after the commit, so open chats never hide a message that is still there.
    if (remove && !message.isDeleted) this.sessions.announceMessageDeleted(message.conversationId, messageId);
    this.logger.log(`reports ${status.toLowerCase()} gym=${gymId} message=${messageId} reports=${closed} by=${caller.sub}`);
    return { ok: true as const, status, reportsClosed: closed };
  }
}
