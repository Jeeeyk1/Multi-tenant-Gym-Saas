import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';
import { LLM_PORT } from './application/ports/llm.port';
import { AnthropicLlmAdapter } from './infrastructure/llm/anthropic-llm.adapter';
import { InsightsRepository } from './infrastructure/persistence/insights.repository';
import { ToolRegistry } from './application/tools/tool-registry';
import { ActionTools } from './application/tools/action-tools';
import { PendingActionStore } from './infrastructure/persistence/pending-action.store';
import { ConfirmActionUseCase } from './application/use-cases/confirm-action.use-case';
import { CancelActionUseCase } from './application/use-cases/cancel-action.use-case';
import { RateLimiterService } from '../../common/rate-limiter/rate-limiter.service';
import { AnswerQueryUseCase } from './application/use-cases/answer-query.use-case';
import { GetAiUsageUseCase } from './application/use-cases/get-ai-usage.use-case';
import { InsightsController } from './presentation/controllers/insights.controller';
import { MembersModule } from '../members/members.module';
import { RenewalsModule } from '../renewals/renewals.module';
import { MembershipPlansModule } from '../membership-plans/membership-plans.module';
import { AiUsageModule } from '../ai-usage/ai-usage.module';

@Module({
  imports: [MembersModule, RenewalsModule, MembershipPlansModule, AiUsageModule],
  controllers: [InsightsController],
  providers: [
    InsightsRepository,
    ToolRegistry,
    ActionTools,
    PendingActionStore,
    ConfirmActionUseCase,
    CancelActionUseCase,
    RateLimiterService,
    AnswerQueryUseCase,
    GetAiUsageUseCase,
    {
      provide: LLM_PORT,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const apiKey = config.get<string>('ANTHROPIC_API_KEY', '');
        const model = config.get<string>('ANTHROPIC_INSIGHTS_MODEL', 'claude-haiku-4-5');
        return new AnthropicLlmAdapter(new Anthropic({ apiKey }), model);
      },
    },
  ],
})
export class AiInsightsModule {}
