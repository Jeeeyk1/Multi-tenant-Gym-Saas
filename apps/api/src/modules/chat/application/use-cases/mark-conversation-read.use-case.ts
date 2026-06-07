import { Injectable } from '@nestjs/common';
import { ChatRepository } from '../../infrastructure/persistence/chat.repository';
import { NotFoundError } from '../../../../common/errors/not-found.error';
import { ForbiddenError } from '../../../../common/errors/forbidden.error';
import type { GymAuthUser } from '../../../../common/types/auth.types';

@Injectable()
export class MarkConversationReadUseCase {
  constructor(private readonly repo: ChatRepository) {}

  async execute(gymId: string, conversationId: string, caller: GymAuthUser) {
    if (caller.gymId !== gymId) {
      throw new ForbiddenError('Gym access denied', 'GYM_ACCESS_DENIED');
    }

    const conversation = await this.repo.findConversation(conversationId, gymId);
    if (!conversation) {
      throw new NotFoundError('Conversation not found', 'CONVERSATION_NOT_FOUND');
    }

    const membership =
      conversation.type === 'COMMUNITY'
        ? await this.repo.upsertMembership(conversationId, caller.sub)
        : await this.repo.findMembership(conversationId, caller.sub);

    if (!membership) {
      throw new ForbiddenError('Not a conversation member', 'NOT_CONVERSATION_MEMBER');
    }

    const result = await this.repo.markRead(conversationId, caller.sub);
    return { lastReadAt: result.lastReadAt };
  }
}
