import { Logger } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';
import { ChatRepository } from './infrastructure/persistence/chat.repository';
import { SendMessageUseCase } from './application/use-cases/send-message.use-case';
import { DeleteMessageUseCase } from './application/use-cases/delete-message.use-case';
import { ReactToMessageUseCase } from './application/use-cases/react-to-message.use-case';
import { MarkConversationReadUseCase } from './application/use-cases/mark-conversation-read.use-case';
import type { GymAuthUser } from '../../common/types/auth.types';

// ─── Payload shapes ───────────────────────────────────────────────────────────

interface JoinPayload {
  conversationId: string;
}

interface SendPayload {
  conversationId: string;
  content: string;
  replyToId?: string;
}

interface DeletePayload {
  conversationId: string;
  messageId: string;
}

interface ReactPayload {
  conversationId: string;
  messageId: string;
  emoji: string;
}

interface ReadPayload {
  conversationId: string;
}

// ─── Gateway ──────────────────────────────────────────────────────────────────

/**
 * Real-time chat gateway.
 *
 * Namespace: /chat
 *   Isolated from REST traffic. Future namespaces (e.g. /notifications) can
 *   be added independently.
 *
 * Room naming: 'conversation:{conversationId}'
 *   Works identically for COMMUNITY, DIRECT, and GROUP conversation types.
 *   Adding private/group chat later requires no changes here — just create the
 *   conversation record and enrol the users; the gateway handles the rest.
 *
 * Auth:
 *   JWT must be passed in the socket.io handshake:
 *     socket = io('/chat', { auth: { token: '<jwt>' } })
 *   The token is validated in handleConnection; invalid connections are
 *   rejected immediately.
 *
 * Events (client → server):
 *   join               { conversationId }                  → join a room
 *   message.send       { conversationId, content, replyToId? }
 *   message.delete     { conversationId, messageId }
 *   message.react      { conversationId, messageId, emoji }
 *   conversation.read  { conversationId }
 *
 * Events (server → room):
 *   message.new        { ...messageShape }
 *   message.deleted    { messageId, conversationId }
 *   message.reaction   { messageId, conversationId, userId, action, emoji }
 *
 * All client→server events return an acknowledgement:
 *   success → { ok: true, ...data }
 *   failure → { error: '<ERROR_CODE>', message: '<human text>' }
 */
@WebSocketGateway({ namespace: '/chat', cors: { origin: '*' } })
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  private readonly server!: Server;

  private readonly logger = new Logger(ChatGateway.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly repo: ChatRepository,
    private readonly sendMessageUseCase: SendMessageUseCase,
    private readonly deleteMessageUseCase: DeleteMessageUseCase,
    private readonly reactToMessageUseCase: ReactToMessageUseCase,
    private readonly markConversationReadUseCase: MarkConversationReadUseCase,
  ) {}

  // ─── Connection lifecycle ─────────────────────────────────────────────────

  async handleConnection(socket: Socket) {
    try {
      const raw: string | undefined =
        socket.handshake.auth?.token ??
        (socket.handshake.query?.token as string | undefined) ??
        socket.handshake.headers?.authorization;

      const token = raw?.replace(/^Bearer\s+/i, '').trim();
      if (!token) throw new Error('No token provided');

      const user = await this.jwtService.verifyAsync<GymAuthUser>(token);
      if (user.type !== 'gym') throw new Error('Org tokens cannot access chat');

      socket.data.user = user;
      this.logger.debug(`Connected: socket=${socket.id} user=${user.sub} gym=${user.gymId}`);
    } catch (err: any) {
      // Emit the error so the client can read it before the socket closes
      socket.emit('error', {
        code: 'UNAUTHORIZED',
        message: err.message ?? 'Authentication failed',
      });
      socket.disconnect();
    }
  }

  handleDisconnect(socket: Socket) {
    const user: GymAuthUser | undefined = socket.data.user;
    this.logger.debug(`Disconnected: socket=${socket.id} user=${user?.sub ?? 'unknown'}`);
  }

  // ─── join ─────────────────────────────────────────────────────────────────

  /**
   * Subscribe to a conversation room. Must be called for each conversation
   * the client wants to receive real-time events from.
   *
   * The gateway re-validates conversation membership on every join so that
   * a revoked membership takes effect without requiring a reconnect.
   */
  @SubscribeMessage('join')
  async handleJoin(
    @ConnectedSocket() socket: Socket,
    @MessageBody() payload: JoinPayload,
  ) {
    const user: GymAuthUser = socket.data.user;
    const { conversationId } = this.parse<JoinPayload>(payload);

    const conversation = await this.repo.findConversation(conversationId, user.gymId);
    if (!conversation) return { error: 'CONVERSATION_NOT_FOUND' };

    const membership =
      conversation.type === 'COMMUNITY'
        ? await this.repo.upsertMembership(conversationId, user.sub)
        : await this.repo.findMembership(conversationId, user.sub);

    if (!membership) return { error: 'NOT_CONVERSATION_MEMBER' };

    await socket.join(this.room(conversationId));
    this.logger.debug(`User ${user.sub} joined ${this.room(conversationId)}`);
    return { ok: true };
  }

  // ─── message.send ─────────────────────────────────────────────────────────

  /**
   * Persist a message and broadcast 'message.new' to all room members
   * (including the sender — simplifies client-side state management).
   */
  @SubscribeMessage('message.send')
  async handleSendMessage(
    @ConnectedSocket() socket: Socket,
    @MessageBody() payload: SendPayload,
  ) {
    const user: GymAuthUser = socket.data.user;
    const { conversationId, content, replyToId } = this.parse<SendPayload>(payload);
    try {
      const message = await this.sendMessageUseCase.execute(
        user.gymId,
        conversationId,
        { content, replyToId },
        user,
      );
      this.server.to(this.room(conversationId)).emit('message.new', message);
      return { ok: true, message };
    } catch (err: any) {
      return { error: err.code ?? 'SEND_FAILED', message: err.message };
    }
  }

  // ─── message.delete ───────────────────────────────────────────────────────

  /**
   * Soft-delete a message and broadcast 'message.deleted' to the room.
   * Clients should replace the message content with "This message was deleted".
   */
  @SubscribeMessage('message.delete')
  async handleDeleteMessage(
    @ConnectedSocket() socket: Socket,
    @MessageBody() payload: DeletePayload,
  ) {
    const user: GymAuthUser = socket.data.user;
    const { conversationId, messageId } = this.parse<DeletePayload>(payload);
    try {
      await this.deleteMessageUseCase.execute(
        user.gymId,
        conversationId,
        messageId,
        user,
      );
      this.server
        .to(this.room(conversationId))
        .emit('message.deleted', { messageId, conversationId });
      return { ok: true };
    } catch (err: any) {
      return { error: err.code ?? 'DELETE_FAILED', message: err.message };
    }
  }

  // ─── message.react ────────────────────────────────────────────────────────

  /**
   * Toggle an emoji reaction and broadcast 'message.reaction' to the room.
   * Sending the same emoji twice removes the reaction (toggle semantics).
   */
  @SubscribeMessage('message.react')
  async handleReaction(
    @ConnectedSocket() socket: Socket,
    @MessageBody() payload: ReactPayload,
  ) {
    const user: GymAuthUser = socket.data.user;
    const { conversationId, messageId, emoji } = this.parse<ReactPayload>(payload);
    try {
      const result = await this.reactToMessageUseCase.execute(
        user.gymId,
        conversationId,
        messageId,
        emoji,
        user,
      );
      this.server
        .to(this.room(conversationId))
        .emit('message.reaction', {
          messageId,
          conversationId,
          userId: user.sub,
          ...result,
        });
      return { ok: true, ...result };
    } catch (err: any) {
      return { error: err.code ?? 'REACT_FAILED', message: err.message };
    }
  }

  // ─── conversation.read ────────────────────────────────────────────────────

  /**
   * Update last_read_at to now. No room broadcast — this is per-user state.
   * The client uses the returned lastReadAt to calculate local unread counts.
   */
  @SubscribeMessage('conversation.read')
  async handleMarkRead(
    @ConnectedSocket() socket: Socket,
    @MessageBody() payload: ReadPayload,
  ) {
    const user: GymAuthUser = socket.data.user;
    const { conversationId } = this.parse<ReadPayload>(payload);
    try {
      const result = await this.markConversationReadUseCase.execute(
        user.gymId,
        conversationId,
        user,
      );
      return { ok: true, ...result };
    } catch (err: any) {
      return { error: err.code ?? 'READ_FAILED', message: err.message };
    }
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  /** Canonical room name. Prefix makes it easy to add other room types later. */
  private room(conversationId: string): string {
    return `conversation:${conversationId}`;
  }

  /**
   * Some Socket.IO test clients (e.g. Hoppscotch) send event data as a JSON
   * string rather than a parsed object. This helper normalises both forms so
   * the gateway works correctly regardless of the client.
   */
  private parse<T>(payload: T | string): T {
    if (typeof payload === 'string') {
      try {
        return JSON.parse(payload) as T;
      } catch {
        return {} as T;
      }
    }
    return payload;
  }
}
