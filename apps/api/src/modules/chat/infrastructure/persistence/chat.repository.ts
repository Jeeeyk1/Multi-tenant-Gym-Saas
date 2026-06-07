import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../common/prisma/prisma.service';

const MESSAGE_SELECT = {
  id: true,
  conversationId: true,
  senderId: true,
  replyToId: true,
  type: true,
  content: true,
  metadata: true,
  isDeleted: true,
  isPinned: true,
  sentAt: true,
  editedAt: true,
  sender: { select: { id: true, fullName: true } },
  reactions: {
    select: { userId: true, emoji: true, reactedAt: true },
  },
  replyTo: {
    select: {
      id: true,
      senderId: true,
      content: true,
      isDeleted: true,
      sender: { select: { id: true, fullName: true } },
    },
  },
} as const;

@Injectable()
export class ChatRepository {
  constructor(private readonly prisma: PrismaService) {}

  findDefaultConversation(gymId: string) {
    return this.prisma.conversation.findFirst({
      where: { gymId, isDefault: true, type: 'COMMUNITY' },
      select: { id: true, gymId: true, type: true, name: true, isDefault: true },
    });
  }

  findConversation(conversationId: string, gymId: string) {
    return this.prisma.conversation.findFirst({
      where: { id: conversationId, gymId },
      select: {
        id: true,
        gymId: true,
        type: true,
        name: true,
        isDefault: true,
        isAnnouncementOnly: true,
      },
    });
  }

  findMembership(conversationId: string, userId: string) {
    return this.prisma.conversationMember.findUnique({
      where: { conversationId_userId: { conversationId, userId } },
      select: { id: true, role: true, lastReadAt: true, isMuted: true },
    });
  }

  upsertMembership(conversationId: string, userId: string) {
    return this.prisma.conversationMember.upsert({
      where: { conversationId_userId: { conversationId, userId } },
      create: { conversationId, userId, role: 'MEMBER' },
      update: {},
      select: { id: true, role: true, lastReadAt: true, isMuted: true },
    });
  }

  findGymMemberStatus(gymId: string, userId: string) {
    return this.prisma.gymMember.findFirst({
      where: { gymId, userId },
      select: { status: true },
    });
  }

  listMessages(conversationId: string, opts: { limit: number; before?: Date }) {
    return this.prisma.message.findMany({
      where: {
        conversationId,
        ...(opts.before ? { sentAt: { lt: opts.before } } : {}),
      },
      select: MESSAGE_SELECT,
      orderBy: { sentAt: 'desc' },
      take: opts.limit,
    });
  }

  createMessage(input: {
    conversationId: string;
    senderId: string;
    type: string;
    content: string;
    replyToId?: string;
  }) {
    return this.prisma.message.create({
      data: {
        conversationId: input.conversationId,
        senderId: input.senderId,
        type: input.type,
        content: input.content,
        replyToId: input.replyToId,
      },
      select: MESSAGE_SELECT,
    });
  }

  findMessageById(messageId: string, conversationId: string) {
    return this.prisma.message.findFirst({
      where: { id: messageId, conversationId },
      select: { id: true, conversationId: true, senderId: true, isDeleted: true },
    });
  }

  softDeleteMessage(messageId: string) {
    return this.prisma.message.update({
      where: { id: messageId },
      data: { isDeleted: true, content: null },
      select: { id: true, isDeleted: true },
    });
  }

  findReaction(messageId: string, userId: string, emoji: string) {
    return this.prisma.messageReaction.findUnique({
      where: { messageId_userId_emoji: { messageId, userId, emoji } },
      select: { id: true },
    });
  }

  addReaction(messageId: string, userId: string, emoji: string) {
    return this.prisma.messageReaction.create({
      data: { messageId, userId, emoji },
      select: { id: true, userId: true, emoji: true, reactedAt: true },
    });
  }

  removeReaction(messageId: string, userId: string, emoji: string) {
    return this.prisma.messageReaction.delete({
      where: { messageId_userId_emoji: { messageId, userId, emoji } },
    });
  }

  markRead(conversationId: string, userId: string) {
    return this.prisma.conversationMember.update({
      where: { conversationId_userId: { conversationId, userId } },
      data: { lastReadAt: new Date() },
      select: { lastReadAt: true },
    });
  }
}
