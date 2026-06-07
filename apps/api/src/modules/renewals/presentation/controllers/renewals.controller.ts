import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../../../common/decorators/current-user.decorator';
import { RenewMembershipUseCase } from '../../application/use-cases/renew-membership.use-case';
import { ListRenewalsUseCase } from '../../application/use-cases/list-renewals.use-case';
import { RenewMembershipDto } from '../dto/renew-membership.dto';
import type { AuthenticatedUser } from '../../../../common/types/auth.types';

@Controller('gyms/:gymId/members/:memberId')
@UseGuards(JwtAuthGuard)
export class RenewalsController {
  constructor(
    private readonly renewMembershipUseCase: RenewMembershipUseCase,
    private readonly listRenewalsUseCase: ListRenewalsUseCase,
  ) {}

  /**
   * POST /gyms/:gymId/members/:memberId/renew
   * Process a membership renewal. Requires members.renew permission.
   */
  @Post('renew')
  @HttpCode(HttpStatus.CREATED)
  renew(
    @Param('gymId') gymId: string,
    @Param('memberId') memberId: string,
    @Body() dto: RenewMembershipDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.renewMembershipUseCase.execute(gymId, memberId, {
      planId: dto.planId,
      amountPaid: dto.amountPaid,
      paymentMethod: dto.paymentMethod,
      notes: dto.notes,
    }, user);
  }

  /**
   * GET /gyms/:gymId/members/:memberId/renewals
   * List renewal history for a member. Requires members.view permission.
   */
  @Get('renewals')
  listRenewals(
    @Param('gymId') gymId: string,
    @Param('memberId') memberId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.listRenewalsUseCase.execute(gymId, memberId, user);
  }
}
