import { Injectable } from '@nestjs/common';
import { ChatRepository } from '../../infrastructure/persistence/chat.repository';
import { NotFoundError } from '../../../../common/errors/not-found.error';
import { ForbiddenError } from '../../../../common/errors/forbidden.error';
import type { GymAuthUser } from '../../../../common/types/auth.types';

@Injectable()
export class SendMessageUseCase {
  constructor(private readonly repo: ChatRepository) {}

  async execute(
    gymId: string,
    conversationId: string,
    input: { content: string; replyToId?: string },
    caller: GymAuthUser,
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

    // If the caller has a gym_members record, their membership must be ACTIVE to chat.
    // Staff have no gym_members record so this check is skipped for them.
    const gymMember = await this.repo.findGymMemberStatus(gymId, caller.sub);
    if (gymMember && gymMember.status !== 'ACTIVE') {
      throw new ForbiddenError('Membership is not active', 'MEMBERSHIP_NOT_ACTIVE');
    }

    return this.repo.createMessage({
      conversationId,
      senderId: caller.sub,
      type: 'TEXT',
      content: input.content,
      replyToId: input.replyToId,
    });
  }
}
