import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../../../common/decorators/current-user.decorator';
import { AnswerQueryUseCase } from '../../application/use-cases/answer-query.use-case';
import { InsightsQueryDto } from '../dto/insights-query.dto';
import type { AuthenticatedUser } from '../../../../common/types/auth.types';

@Controller('gyms/:gymId/insights')
@UseGuards(JwtAuthGuard)
export class InsightsController {
  constructor(private readonly answerQueryUseCase: AnswerQueryUseCase) {}

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
