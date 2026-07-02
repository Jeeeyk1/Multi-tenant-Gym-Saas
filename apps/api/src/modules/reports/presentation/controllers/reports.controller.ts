import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../../../common/decorators/current-user.decorator';
import { GetCheckinsTrendUseCase } from '../../application/use-cases/get-checkins-trend.use-case';
import { CheckinsTrendQueryDto } from '../dto/checkins-trend-query.dto';
import type { AuthenticatedUser } from '../../../../common/types/auth.types';

@Controller('gyms/:gymId/reports')
@UseGuards(JwtAuthGuard)
export class ReportsController {
  constructor(private readonly getCheckinsTrendUseCase: GetCheckinsTrendUseCase) {}

  /**
   * GET /gyms/:gymId/reports/checkins-trend?days=7|30
   * Requires reports.view permission.
   */
  @Get('checkins-trend')
  getCheckinsTrend(
    @Param('gymId') gymId: string,
    @Query() query: CheckinsTrendQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.getCheckinsTrendUseCase.execute(gymId, query.days ?? 7, user);
  }
}
