import { Injectable, Logger } from '@nestjs/common';
import { ForbiddenError, NotFoundError, ValidationError } from '../../../../common/errors';
import { assertGymAccess } from '../../../../common/auth/authorization';
import type { ReportReason } from '../../../../common/enums';
import type { AuthenticatedUser } from '../../../../common/types/auth.types';
import { ChatSafetyRepository } from '../../infrastructure/persistence/chat-safety.repository';

/** Anyone who can see a message can report it. Staff with chat.manage review reports. */
@Injectable()
export class ReportMessageUseCase {
  private readonly logger = new Logger(ReportMessageUseCase.name);

  constructor(private readonly repo: ChatSafetyRepository) {}

  async execute(gymId: string, messageId: string, input: { reason: ReportReason; note?: string }, caller: AuthenticatedUser) {
    assertGymAccess(caller, gymId);

    const message = await this.repo.findMessageInGym(messageId, gymId);
    if (!message || message.isDeleted) throw new NotFoundError('Message not found', 'MESSAGE_NOT_FOUND');
    // Community chat is open to everyone in the gym; anything else needs membership of the conversation.
    if (message.conversation.type !== 'COMMUNITY' && !(await this.repo.isConversationMember(message.conversationId, caller.sub))) {
      throw new ForbiddenError('Not a conversation member', 'NOT_CONVERSATION_MEMBER');
    }
    if (message.senderId === caller.sub) throw new ValidationError("You can't report your own message", 'CANNOT_REPORT_OWN');

    const created = await this.repo.createReport({
      gymId,
      messageId,
      reporterUserId: caller.sub,
      reason: input.reason,
      note: input.note?.trim() || undefined,
    });
    if (created) {
      this.logger.warn(`message reported gym=${gymId} message=${messageId} reporter=${caller.sub} reason=${input.reason}`);
    }
    return { ok: true as const };
  }
}
