import { Module } from '@nestjs/common';
import { AiAllowanceService } from './application/ai-allowance.service';
import { AiUsageRepository } from './infrastructure/ai-usage.repository';

/** AI cost tracking and each gym's monthly AI allowance, shared by the staff assistant and member AI. */
@Module({
  providers: [AiUsageRepository, AiAllowanceService],
  exports: [AiAllowanceService],
})
export class AiUsageModule {}
