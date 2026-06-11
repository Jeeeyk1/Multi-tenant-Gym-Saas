import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../../../common/decorators/current-user.decorator';
import { ListGymRenewalsUseCase } from '../../application/use-cases/list-gym-renewals.use-case';
import type { AuthenticatedUser } from '../../../../common/types/auth.types';

@Controller('gyms/:gymId/renewals')
@UseGuards(JwtAuthGuard)
export class GymRenewalsController {
  constructor(private readonly listGymRenewalsUseCase: ListGymRenewalsUseCase) {}

  /**
   * GET /gyms/:gymId/renewals?limit=50
   * List recent renewals across the gym. Requires members.view permission.
   */
  @Get()
  list(
    @Param('gymId') gymId: string,
    @Query('limit') limit: string | undefined,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.listGymRenewalsUseCase.execute(gymId, user, limit ? Math.min(parseInt(limit, 10), 200) : 50);
  }
}
