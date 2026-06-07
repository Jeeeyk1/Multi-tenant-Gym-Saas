import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../../../common/decorators/current-user.decorator';
import { ForbiddenError } from '../../../../common/errors/forbidden.error';
import { ListMessagesUseCase } from '../../application/use-cases/list-messages.use-case';
import { SendMessageUseCase } from '../../application/use-cases/send-message.use-case';
import { DeleteMessageUseCase } from '../../application/use-cases/delete-message.use-case';
import { ReactToMessageUseCase } from '../../application/use-cases/react-to-message.use-case';
import { MarkConversationReadUseCase } from '../../application/use-cases/mark-conversation-read.use-case';
import { SendMessageDto } from '../dto/send-message.dto';
import { ReactToMessageDto } from '../dto/react-to-message.dto';
import { ListMessagesQueryDto } from '../dto/list-messages-query.dto';
import type { AuthenticatedUser } from '../../../../common/types/auth.types';

@Controller('gyms/:gymId/conversations/:conversationId')
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(
    private readonly listMessagesUseCase: ListMessagesUseCase,
    private readonly sendMessageUseCase: SendMessageUseCase,
    private readonly deleteMessageUseCase: DeleteMessageUseCase,
    private readonly reactToMessageUseCase: ReactToMessageUseCase,
    private readonly markConversationReadUseCase: MarkConversationReadUseCase,
  ) {}

  /**
   * GET /gyms/:gymId/conversations/:conversationId/messages
   * Paginated message feed. Caller must be a conversation member.
   * Supports ?limit=50&before=<ISO8601> for cursor pagination.
   */
  @Get('messages')
  listMessages(
    @Param('gymId') gymId: string,
    @Param('conversationId') conversationId: string,
    @Query() query: ListMessagesQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const gymUser = this.asGymUser(user);
    return this.listMessagesUseCase.execute(gymId, conversationId, gymUser, {
      limit: query.limit,
      before: query.before,
    });
  }

  /**
   * POST /gyms/:gymId/conversations/:conversationId/messages
   * Send a text message. Members must have ACTIVE membership.
   */
  @Post('messages')
  @HttpCode(HttpStatus.CREATED)
  sendMessage(
    @Param('gymId') gymId: string,
    @Param('conversationId') conversationId: string,
    @Body() dto: SendMessageDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const gymUser = this.asGymUser(user);
    return this.sendMessageUseCase.execute(
      gymId,
      conversationId,
      { content: dto.content, replyToId: dto.replyToId },
      gymUser,
    );
  }

  /**
   * DELETE /gyms/:gymId/conversations/:conversationId/messages/:msgId
   * Soft-delete a message. Only the sender or staff with chat.manage may delete.
   */
  @Delete('messages/:msgId')
  @HttpCode(HttpStatus.OK)
  deleteMessage(
    @Param('gymId') gymId: string,
    @Param('conversationId') conversationId: string,
    @Param('msgId') msgId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const gymUser = this.asGymUser(user);
    return this.deleteMessageUseCase.execute(gymId, conversationId, msgId, gymUser);
  }

  /**
   * POST /gyms/:gymId/conversations/:conversationId/messages/:msgId/react
   * Toggle an emoji reaction. Calling again with the same emoji removes it.
   */
  @Post('messages/:msgId/react')
  @HttpCode(HttpStatus.OK)
  reactToMessage(
    @Param('gymId') gymId: string,
    @Param('conversationId') conversationId: string,
    @Param('msgId') msgId: string,
    @Body() dto: ReactToMessageDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const gymUser = this.asGymUser(user);
    return this.reactToMessageUseCase.execute(gymId, conversationId, msgId, dto.emoji, gymUser);
  }

  /**
   * POST /gyms/:gymId/conversations/:conversationId/read
   * Update last_read_at to now — drives unread count on the client.
   */
  @Post('read')
  @HttpCode(HttpStatus.OK)
  markRead(
    @Param('gymId') gymId: string,
    @Param('conversationId') conversationId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const gymUser = this.asGymUser(user);
    return this.markConversationReadUseCase.execute(gymId, conversationId, gymUser);
  }

  /**
   * Narrows AuthenticatedUser to GymAuthUser, throwing if it is an org token.
   * Returning the narrowed type lets TypeScript track it through to use-case calls.
   */
  private asGymUser(user: AuthenticatedUser) {
    if (user.type !== 'gym') {
      throw new ForbiddenError('Only gym users can access chat', 'GYM_ACCESS_DENIED');
    }
    return user;
  }
}
