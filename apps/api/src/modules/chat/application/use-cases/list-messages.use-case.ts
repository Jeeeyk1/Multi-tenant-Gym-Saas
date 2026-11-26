import { Injectable } from '@nestjs/common';
import { ChatRepository } from '../../infrastructure/persistence/chat.repository';
import { ChatSafetyRepository } from '../../infrastructure/persistence/chat-safety.repository';
import { NotFoundError } from '../../../../common/errors/not-found.error';
import { ForbiddenError } from '../../../../common/errors/forbidden.error';
import type { GymAuthUser } from '../../../../common/types/auth.types';

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

@Injectable()
export class ListMessagesUseCase {
  constructor(
    private readonly repo: ChatRepository,
    private readonly safety: ChatSafetyRepository,
  ) {}

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

    // Messages from people the caller blocked are left out, and so is their text quoted in a reply.
    const excludeSenderIds = await this.safety.blockedIds(caller.sub);
    const messages = await this.repo.listMessages(conversationId, { limit, before, excludeSenderIds });
    if (excludeSenderIds.length === 0) return messages;
    const blocked = new Set(excludeSenderIds);
    return messages.map((message) =>
      message.replyTo && blocked.has(message.replyTo.senderId)
        ? { ...message, replyTo: { ...message.replyTo, content: null, isDeleted: true } }
        : message,
    );
  }
}
