import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../../../common/decorators/current-user.decorator';
import { CheckInUseCase } from '../../application/use-cases/check-in.use-case';
import { CheckoutUseCase } from '../../application/use-cases/checkout.use-case';
import { ListActiveCheckinsUseCase } from '../../application/use-cases/list-active-checkins.use-case';
import { ListActivePublicCheckinsUseCase } from '../../application/use-cases/list-active-public-checkins.use-case';
import { ListCheckinHistoryUseCase } from '../../application/use-cases/list-checkin-history.use-case';
import { ListMyCheckInsUseCase } from '../../application/use-cases/list-my-checkins.use-case';
import { CheckInDto } from '../dto/check-in.dto';
import { CheckinHistoryQueryDto } from '../dto/checkin-history-query.dto';
import type { AuthenticatedUser } from '../../../../common/types/auth.types';

@Controller('gyms/:gymId/checkins')
@UseGuards(JwtAuthGuard)
export class CheckInsController {
  constructor(
    private readonly checkInUseCase: CheckInUseCase,
    private readonly checkoutUseCase: CheckoutUseCase,
    private readonly listActiveCheckinsUseCase: ListActiveCheckinsUseCase,
    private readonly listActivePublicCheckinsUseCase: ListActivePublicCheckinsUseCase,
    private readonly listCheckinHistoryUseCase: ListCheckinHistoryUseCase,
    private readonly listMyCheckInsUseCase: ListMyCheckInsUseCase,
  ) {}

  /**
   * POST /gyms/:gymId/checkins
   * Check in a member using any of the 4 supported methods.
   * Staff methods require checkins.manage; self methods require checkins.self.
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  checkIn(
    @Param('gymId') gymId: string,
    @Body() dto: CheckInDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.checkInUseCase.execute(
      gymId,
      { method: dto.method, memberId: dto.memberId, qrCodeToken: dto.qrCodeToken },
      user,
    );
  }

  /**
   * GET /gyms/:gymId/checkins/me
   * List the caller's own check-in history. Requires checkins.self permission.
   * Must be declared before `:checkinId` routes to avoid route conflict.
   */
  @Get('me')
  listMyCheckIns(
    @Param('gymId') gymId: string,
    @Query() query: CheckinHistoryQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.listMyCheckInsUseCase.execute(gymId, { limit: query.limit }, user);
  }

  /**
   * GET /gyms/:gymId/checkins/active
   * List all currently checked-in members. Requires checkins.view permission.
   * Must be declared before `:checkinId` route to avoid route conflict.
   */
  @Get('active')
  listActive(@Param('gymId') gymId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.listActiveCheckinsUseCase.execute(gymId, user);
  }

  /**
   * GET /gyms/:gymId/checkins/active-public
   * Member-facing "who's at the gym" view. Always returns the total active count.
   * The `visible` list only includes members who opted in to display their identity
   * (member_privacy.hide_checkin_visibility = false). No permission required beyond
   * gym access — every authenticated member of this gym can see this.
   */
  @Get('active-public')
  listActivePublic(
    @Param('gymId') gymId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.listActivePublicCheckinsUseCase.execute(gymId, user);
  }

  /**
   * GET /gyms/:gymId/checkins
   * Paginated check-in history. Requires checkins.view permission.
   */
  @Get()
  listHistory(
    @Param('gymId') gymId: string,
    @Query() query: CheckinHistoryQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.listCheckinHistoryUseCase.execute(gymId, { page: query.page, limit: query.limit }, user);
  }

  /**
   * PATCH /gyms/:gymId/checkins/:checkinId/checkout
   * Manually check out a member. Staff (checkins.manage) or the member themselves.
   */
  @Patch(':checkinId/checkout')
  @HttpCode(HttpStatus.OK)
  checkout(
    @Param('gymId') gymId: string,
    @Param('checkinId') checkinId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.checkoutUseCase.execute(gymId, checkinId, user);
  }
}
