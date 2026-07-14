import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';
import { LLM_PORT } from './application/ports/llm.port';
import { AnthropicLlmAdapter } from './infrastructure/llm/anthropic-llm.adapter';
import { InsightsRepository } from './infrastructure/persistence/insights.repository';
import { ToolRegistry } from './application/tools/tool-registry';
import { EntitlementsService } from './application/entitlements.service';
import { RateLimiterService } from '../../common/rate-limiter/rate-limiter.service';
import { AnswerQueryUseCase } from './application/use-cases/answer-query.use-case';
import { InsightsController } from './presentation/controllers/insights.controller';
import { MembersModule } from '../members/members.module';
import { RenewalsModule } from '../renewals/renewals.module';
import { MembershipPlansModule } from '../membership-plans/membership-plans.module';

@Module({
  imports: [MembersModule, RenewalsModule, MembershipPlansModule],
  controllers: [InsightsController],
  providers: [
    InsightsRepository,
    ToolRegistry,
    EntitlementsService,
    RateLimiterService,
    AnswerQueryUseCase,
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
