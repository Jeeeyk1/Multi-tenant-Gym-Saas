import { Injectable, Logger } from '@nestjs/common';
import type { Server } from 'socket.io';

/** Each person's sockets for one gym join this room, so they can be found across API instances. */
export function gymUserRoom(gymId: string, userId: string): string {
  return `gym-user:${gymId}:${userId}`;
}

/**
 * Ends a person's open chat sockets, e.g. after they delete their account (a socket is only
 * authenticated when it connects). The gateway hands over its server at start-up; with the
 * Redis adapter, `disconnectSockets` reaches every instance.
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
}
