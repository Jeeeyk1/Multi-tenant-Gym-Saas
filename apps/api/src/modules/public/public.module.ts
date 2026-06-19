import { Module } from '@nestjs/common';
import { AiProviderModule } from '../../common/adapters/ai/ai-provider.module';
import { LandingChatUseCase } from './application/use-cases/landing-chat.use-case';
import { PublicRepository } from './infrastructure/persistence/public.repository';
import { PublicController } from './presentation/controllers/public.controller';

@Module({
  imports: [AiProviderModule],
  controllers: [PublicController],
  providers: [PublicRepository, LandingChatUseCase],
})
export class PublicModule {}
