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
import { ChatSessionsService } from './application/chat-sessions.service';
import { ChatSafetyRepository } from './infrastructure/persistence/chat-safety.repository';
import { CommunityRulesPolicy } from './application/community-rules.policy';
import { ReportMessageUseCase } from './application/use-cases/report-message.use-case';
import { BlockUserUseCase } from './application/use-cases/block-user.use-case';
import { UnblockUserUseCase } from './application/use-cases/unblock-user.use-case';
import { ListBlocksUseCase } from './application/use-cases/list-blocks.use-case';
import { AcceptCommunityRulesUseCase, GetCommunityRulesUseCase } from './application/use-cases/community-rules.use-case';
import { ListReportsUseCase } from './application/use-cases/list-reports.use-case';
import { ResolveReportUseCase } from './application/use-cases/resolve-report.use-case';
import { ChatSafetyController } from './presentation/controllers/chat-safety.controller';

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
    ChatSessionsService,
    ChatSafetyRepository,
    CommunityRulesPolicy,
    ReportMessageUseCase,
    BlockUserUseCase,
    UnblockUserUseCase,
    ListBlocksUseCase,
    GetCommunityRulesUseCase,
    AcceptCommunityRulesUseCase,
    ListReportsUseCase,
    ResolveReportUseCase,
  ],
  controllers: [ChatController, ConversationsController, ChatSafetyController],
  exports: [ChatSessionsService],
})
export class ChatModule {}
