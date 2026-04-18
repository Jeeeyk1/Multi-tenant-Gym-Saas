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
import { RegisterMemberUseCase } from '../../application/use-cases/register-member.use-case';
import { ListMembersUseCase } from '../../application/use-cases/list-members.use-case';
import { GetMemberUseCase } from '../../application/use-cases/get-member.use-case';
import { SuspendMemberUseCase } from '../../application/use-cases/suspend-member.use-case';
import { ReactivateMemberUseCase } from '../../application/use-cases/reactivate-member.use-case';
import { GetMemberQrUseCase } from '../../application/use-cases/get-member-qr.use-case';
import { RegisterMemberDto } from '../dto/register-member.dto';
import { ListMembersQueryDto } from '../dto/list-members-query.dto';
import type { AuthenticatedUser } from '../../../../common/types/auth.types';

@Controller('gyms/:gymId/members')
@UseGuards(JwtAuthGuard)
export class MembersController {
  constructor(
    private readonly registerMemberUseCase: RegisterMemberUseCase,
    private readonly listMembersUseCase: ListMembersUseCase,
    private readonly getMemberUseCase: GetMemberUseCase,
    private readonly suspendMemberUseCase: SuspendMemberUseCase,
    private readonly reactivateMemberUseCase: ReactivateMemberUseCase,
    private readonly getMemberQrUseCase: GetMemberQrUseCase,
  ) {}

  /**
   * POST /gyms/:gymId/members
   * Register a new member. Requires members.create permission.
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  register(
    @Param('gymId') gymId: string,
    @Body() dto: RegisterMemberDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.registerMemberUseCase.execute(
      gymId,
      {
        email: dto.email,
        fullName: dto.fullName,
        phone: dto.phone,
        planId: dto.planId,
        expiryDate: dto.expiryDate,
      },
      user,
    );
  }

  /**
   * GET /gyms/:gymId/members
   * List members (paginated). Requires members.view permission.
   */
  @Get()
  list(
    @Param('gymId') gymId: string,
    @Query() query: ListMembersQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.listMembersUseCase.execute(gymId, { page: query.page, limit: query.limit }, user);
  }

  /**
   * GET /gyms/:gymId/members/:memberId
   * Get member detail. Requires members.view permission.
   */
  @Get(':memberId')
  getOne(
    @Param('gymId') gymId: string,
    @Param('memberId') memberId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.getMemberUseCase.execute(gymId, memberId, user);
  }

  /**
   * GET /gyms/:gymId/members/:memberId/qr
   * Get member QR token. Staff: members.view. Member: own QR only.
   */
  @Get(':memberId/qr')
  getQr(
    @Param('gymId') gymId: string,
    @Param('memberId') memberId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.getMemberQrUseCase.execute(gymId, memberId, user);
  }

  /**
   * PATCH /gyms/:gymId/members/:memberId/suspend
   * Suspend a member. Requires members.suspend permission.
   */
  @Patch(':memberId/suspend')
  @HttpCode(HttpStatus.OK)
  suspend(
    @Param('gymId') gymId: string,
    @Param('memberId') memberId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.suspendMemberUseCase.execute(gymId, memberId, user);
  }

  /**
   * PATCH /gyms/:gymId/members/:memberId/reactivate
   * Reactivate a member. Requires members.edit permission.
   */
  @Patch(':memberId/reactivate')
  @HttpCode(HttpStatus.OK)
  reactivate(
    @Param('gymId') gymId: string,
    @Param('memberId') memberId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.reactivateMemberUseCase.execute(gymId, memberId, user);
  }
}
