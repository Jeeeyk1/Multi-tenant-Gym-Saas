import { Controller, Get, NotFoundException, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../../common/guards/jwt-auth.guard';
import { ChatRepository } from '../../infrastructure/persistence/chat.repository';

/**
 * GET /gyms/:gymId/conversations/default
 * Returns the default community conversation for the gym.
 * Used by the mobile app to discover the conversationId on login.
 */
@Controller('gyms/:gymId/conversations')
@UseGuards(JwtAuthGuard)
export class ConversationsController {
  constructor(private readonly chatRepository: ChatRepository) {}

  @Get('default')
  async getDefault(@Param('gymId') gymId: string) {
    const conversation = await this.chatRepository.findDefaultConversation(gymId);
    if (!conversation) {
      throw new NotFoundException('No default community conversation found for this gym');
    }
    return conversation;
  }
}
