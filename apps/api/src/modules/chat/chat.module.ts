import { Module } from '@nestjs/common';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { ChatRepository } from './infrastructure/persistence/chat.repository';
import { ListMessagesUseCase } from './application/use-cases/list-messages.use-case';
import { SendMessageUseCase } from './application/use-cases/send-message.use-case';
import { DeleteMessageUseCase } from './application/use-cases/delete-message.use-case';
import { ReactToMessageUseCase } from './application/use-cases/react-to-message.use-case';
import { MarkConversationReadUseCase } from './application/use-cases/mark-conversation-read.use-case';
import { ChatController } from './presentation/controllers/chat.controller';
import { ConversationsController } from './presentation/controllers/conversations.controller';
import { ChatGateway } from './chat.gateway';

@Module({
  imports: [PrismaModule],
  providers: [
    ChatRepository,
    ListMessagesUseCase,
    SendMessageUseCase,
    DeleteMessageUseCase,
    ReactToMessageUseCase,
    MarkConversationReadUseCase,
    ChatGateway,
  ],
  controllers: [ChatController, ConversationsController],
})
export class ChatModule {}
