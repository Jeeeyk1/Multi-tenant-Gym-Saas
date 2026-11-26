import { Body, Controller, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../../../common/decorators/current-user.decorator';
import { AnswerQueryUseCase } from '../../application/use-cases/answer-query.use-case';
import { GetAiUsageUseCase } from '../../application/use-cases/get-ai-usage.use-case';
import { ConfirmActionUseCase } from '../../application/use-cases/confirm-action.use-case';
import { CancelActionUseCase } from '../../application/use-cases/cancel-action.use-case';
import { InsightsQueryDto } from '../dto/insights-query.dto';
import type { AuthenticatedUser } from '../../../../common/types/auth.types';

@Controller('gyms/:gymId/insights')
@UseGuards(JwtAuthGuard)
export class InsightsController {
  constructor(
    private readonly answerQueryUseCase: AnswerQueryUseCase,
    private readonly getAiUsageUseCase: GetAiUsageUseCase,
    private readonly confirmActionUseCase: ConfirmActionUseCase,
    private readonly cancelActionUseCase: CancelActionUseCase,
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

  /** POST /gyms/:gymId/insights/actions/:actionId/confirm — run an action the assistant proposed. */
  @Post('actions/:actionId/confirm')
  @HttpCode(HttpStatus.OK)
  confirmAction(
    @Param('gymId') gymId: string,
    @Param('actionId', ParseUUIDPipe) actionId: string,
    @CurrentUser() caller: AuthenticatedUser,
  ) {
    return this.confirmActionUseCase.execute(gymId, actionId, caller);
  }

  /** POST /gyms/:gymId/insights/actions/:actionId/cancel */
  @Post('actions/:actionId/cancel')
  @HttpCode(HttpStatus.NO_CONTENT)
  async cancelAction(
    @Param('gymId') gymId: string,
    @Param('actionId', ParseUUIDPipe) actionId: string,
    @CurrentUser() caller: AuthenticatedUser,
  ) {
    await this.cancelActionUseCase.execute(gymId, actionId, caller);
  }
}
