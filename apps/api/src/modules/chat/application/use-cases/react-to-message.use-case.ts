import { Injectable } from '@nestjs/common';
import { ChatRepository } from '../../infrastructure/persistence/chat.repository';
import { NotFoundError } from '../../../../common/errors/not-found.error';
import { ForbiddenError } from '../../../../common/errors/forbidden.error';
import type { GymAuthUser } from '../../../../common/types/auth.types';

@Injectable()
export class ReactToMessageUseCase {
  constructor(private readonly repo: ChatRepository) {}

  async execute(
    gymId: string,
    conversationId: string,
    messageId: string,
    emoji: string,
    caller: GymAuthUser,
  ) {
    if (caller.gymId !== gymId) {
      throw new ForbiddenError('Gym access denied', 'GYM_ACCESS_DENIED');
    }

    const [conversation, message] = await Promise.all([
      this.repo.findConversation(conversationId, gymId),
      this.repo.findMessageById(messageId, conversationId),
    ]);

    if (!message || message.isDeleted) {
      throw new NotFoundError('Message not found', 'MESSAGE_NOT_FOUND');
    }

    const membership =
      conversation?.type === 'COMMUNITY'
        ? await this.repo.upsertMembership(conversationId, caller.sub)
        : await this.repo.findMembership(conversationId, caller.sub);

    if (!membership) {
      throw new ForbiddenError('Not a conversation member', 'NOT_CONVERSATION_MEMBER');
    }

    const existing = await this.repo.findReaction(messageId, caller.sub, emoji);
    if (existing) {
      await this.repo.removeReaction(messageId, caller.sub, emoji);
      return { action: 'removed' as const, emoji };
    }

    await this.repo.addReaction(messageId, caller.sub, emoji);
    return { action: 'added' as const, emoji };
  }
}
