import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../../../common/decorators/current-user.decorator';
import { ListMyRenewalsUseCase } from '../../application/use-cases/list-my-renewals.use-case';
import type { AuthenticatedUser } from '../../../../common/types/auth.types';

@Controller('gyms/:gymId/members/me')
@UseGuards(JwtAuthGuard)
export class MyRenewalsController {
  constructor(private readonly listMyRenewalsUseCase: ListMyRenewalsUseCase) {}

  /**
   * GET /gyms/:gymId/members/me/renewals
   * Return the authenticated member's own renewal history.
   * No `members.view` permission required — scoped to caller.
   */
  @Get('renewals')
  listMyRenewals(
    @Param('gymId') gymId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.listMyRenewalsUseCase.execute(gymId, user);
  }
}
