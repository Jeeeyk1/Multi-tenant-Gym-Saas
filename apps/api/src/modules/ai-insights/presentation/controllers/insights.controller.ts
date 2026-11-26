import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../../../common/decorators/current-user.decorator';
import { AnswerQueryUseCase } from '../../application/use-cases/answer-query.use-case';
import { GetAiUsageUseCase } from '../../application/use-cases/get-ai-usage.use-case';
import { InsightsQueryDto } from '../dto/insights-query.dto';
import type { AuthenticatedUser } from '../../../../common/types/auth.types';

@Controller('gyms/:gymId/insights')
@UseGuards(JwtAuthGuard)
export class InsightsController {
  constructor(
    private readonly answerQueryUseCase: AnswerQueryUseCase,
    private readonly getAiUsageUseCase: GetAiUsageUseCase,
  ) {}

  /** GET /gyms/:gymId/insights/usage — this month's AI allowance and the caller's questions today. */
  @Get('usage')
  usage(@Param('gymId') gymId: string, @CurrentUser() caller: AuthenticatedUser) {
    return this.getAiUsageUseCase.execute(gymId, caller);
  }

  /** POST /gyms/:gymId/insights/query */
  @Post('query')
  query(
    @Param('gymId') gymId: string,
    @Body() dto: InsightsQueryDto,
    @CurrentUser() caller: AuthenticatedUser,
  ) {
    return this.answerQueryUseCase.execute(gymId, { message: dto.message, history: dto.history }, caller);
  }
}
