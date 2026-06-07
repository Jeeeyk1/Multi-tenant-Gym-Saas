import { Injectable } from '@nestjs/common';
import { ChatRepository } from '../../infrastructure/persistence/chat.repository';
import { NotFoundError } from '../../../../common/errors/not-found.error';
import { ForbiddenError } from '../../../../common/errors/forbidden.error';
import type { GymAuthUser } from '../../../../common/types/auth.types';

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

@Injectable()
export class ListMessagesUseCase {
  constructor(private readonly repo: ChatRepository) {}

  async execute(
    gymId: string,
    conversationId: string,
    caller: GymAuthUser,
    opts: { limit?: number; before?: string },
  ) {
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

    const limit = Math.min(opts.limit ?? DEFAULT_LIMIT, MAX_LIMIT);
    const before = opts.before ? new Date(opts.before) : undefined;

    return this.repo.listMessages(conversationId, { limit, before });
  }
}
