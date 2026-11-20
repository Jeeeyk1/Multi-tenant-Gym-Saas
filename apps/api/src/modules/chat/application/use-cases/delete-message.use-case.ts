import { Injectable } from '@nestjs/common';
import { ChatRepository } from '../../infrastructure/persistence/chat.repository';
import { NotFoundError } from '../../../../common/errors/not-found.error';
import { ForbiddenError } from '../../../../common/errors/forbidden.error';
import type { GymAuthUser } from '../../../../common/types/auth.types';

@Injectable()
export class DeleteMessageUseCase {
  constructor(private readonly repo: ChatRepository) {}

  async execute(
    gymId: string,
    conversationId: string,
    messageId: string,
    caller: GymAuthUser,
  ) {
    if (caller.gymId !== gymId) {
      throw new ForbiddenError('Gym access denied', 'GYM_ACCESS_DENIED');
    }

    // The conversation id comes from the URL — confirm it is one of this gym's.
    const conversation = await this.repo.findConversation(conversationId, gymId);
    if (!conversation) {
      throw new NotFoundError('Conversation not found', 'CONVERSATION_NOT_FOUND');
    }

    const message = await this.repo.findMessageById(messageId, conversationId);
    if (!message || message.isDeleted) {
      throw new NotFoundError('Message not found', 'MESSAGE_NOT_FOUND');
    }

    const isSender = message.senderId === caller.sub;
    const canModerate = caller.permissions.includes('chat.manage');
    if (!isSender && !canModerate) {
      throw new ForbiddenError('Cannot delete this message', 'MESSAGE_CANNOT_DELETE');
    }

    return this.repo.softDeleteMessage(messageId);
  }
}
