import { Injectable, Logger } from '@nestjs/common';
import type { Server } from 'socket.io';

/** Each person's sockets for one gym join this room, so they can be found across API instances. */
export function gymUserRoom(gymId: string, userId: string): string {
  return `gym-user:${gymId}:${userId}`;
}

/** Sockets that opened a conversation join this room. */
export function conversationRoom(conversationId: string): string {
  return `conversation:${conversationId}`;
}

/**
 * Reaches open chat sockets from outside the gateway: ending a person's sockets (e.g. after they
 * delete their account, since a socket is only authenticated when it connects) and announcing
 * changes made over REST (e.g. a moderator removing a message). The gateway hands over its
 * server at start-up; with the Redis adapter, rooms reach every instance.
 */
@Injectable()
export class ChatSessionsService {
  private readonly logger = new Logger(ChatSessionsService.name);
  private server: Server | null = null;

  attach(server: Server): void {
    this.server = server;
  }

  async disconnectUser(gymId: string, userId: string): Promise<void> {
    if (!this.server) {
      this.logger.warn(`chat server not ready; sockets not ended gym=${gymId} user=${userId}`);
      return;
    }
    this.server.in(gymUserRoom(gymId, userId)).disconnectSockets(true);
    this.logger.log(`chat sockets ended gym=${gymId} user=${userId}`);
  }

  /** Same event as a delete over the socket, so open chats hide the message. */
  announceMessageDeleted(conversationId: string, messageId: string): void {
    if (!this.server) {
      this.logger.warn(`chat server not ready; delete not announced message=${messageId}`);
      return;
    }
    this.server.to(conversationRoom(conversationId)).emit('message.deleted', { messageId, conversationId });
  }
}
