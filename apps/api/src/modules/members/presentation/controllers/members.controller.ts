import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../../../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../../../common/decorators/current-user.decorator';
import { RegisterMemberUseCase } from '../../application/use-cases/register-member.use-case';
import { ListMembersUseCase } from '../../application/use-cases/list-members.use-case';
import { GetMemberUseCase } from '../../application/use-cases/get-member.use-case';
import { GetMyMemberUseCase } from '../../application/use-cases/get-my-member.use-case';
import { GetMyProfileUseCase } from '../../application/use-cases/get-my-profile.use-case';
import { UpsertMyProfileUseCase } from '../../application/use-cases/upsert-my-profile.use-case';
import { GetMemberProfileUseCase } from '../../application/use-cases/get-member-profile.use-case';
import { UpsertMemberProfileUseCase } from '../../application/use-cases/upsert-member-profile.use-case';
import { LogWeightUseCase } from '../../application/use-cases/log-weight.use-case';
import { ListWeightLogsUseCase } from '../../application/use-cases/list-weight-logs.use-case';
import { SuspendMemberUseCase } from '../../application/use-cases/suspend-member.use-case';
import { ReactivateMemberUseCase } from '../../application/use-cases/reactivate-member.use-case';
import { RemoveMemberUseCase } from '../../application/use-cases/remove-member.use-case';
import { GetMemberQrUseCase } from '../../application/use-cases/get-member-qr.use-case';
import { RegisterDeviceTokenUseCase } from '../../application/use-cases/register-device-token.use-case';
import { UpdateMyPrivacyUseCase } from '../../application/use-cases/update-my-privacy.use-case';
import { ValidateBulkInviteUseCase } from '../../application/use-cases/validate-bulk-invite.use-case';
import { BulkInviteMembersUseCase } from '../../application/use-cases/bulk-invite-members.use-case';
import { DeleteMyAccountUseCase } from '../../application/use-cases/delete-my-account.use-case';
import { GetExpiringMembershipsUseCase } from '../../application/use-cases/get-expiring-memberships.use-case';
import { RegisterMemberDto } from '../dto/register-member.dto';
import { BulkInviteDto } from '../dto/bulk-invite.dto';
import { ListMembersQueryDto } from '../dto/list-members-query.dto';
import { UpsertMyProfileDto } from '../dto/upsert-my-profile.dto';
import { LogWeightDto } from '../dto/log-weight.dto';
import { RegisterDeviceTokenDto } from '../dto/register-device-token.dto';
import { UpdateMyPrivacyDto } from '../dto/update-my-privacy.dto';
import { DeleteMyAccountDto } from '../dto/delete-my-account.dto';
import { ExpiringMembersQueryDto } from '../dto/expiring-members-query.dto';
import type { AuthenticatedUser } from '../../../../common/types/auth.types';

@Controller('gyms/:gymId/members')
@UseGuards(JwtAuthGuard)
export class MembersController {
  constructor(
    private readonly registerMemberUseCase: RegisterMemberUseCase,
    private readonly validateBulkInviteUseCase: ValidateBulkInviteUseCase,
    private readonly bulkInviteMembersUseCase: BulkInviteMembersUseCase,
    private readonly deleteMyAccountUseCase: DeleteMyAccountUseCase,
    private readonly getExpiringMembershipsUseCase: GetExpiringMembershipsUseCase,
    private readonly listMembersUseCase: ListMembersUseCase,
    private readonly getMemberUseCase: GetMemberUseCase,
    private readonly getMyMemberUseCase: GetMyMemberUseCase,
    private readonly getMyProfileUseCase: GetMyProfileUseCase,
    private readonly upsertMyProfileUseCase: UpsertMyProfileUseCase,
    private readonly getMemberProfileUseCase: GetMemberProfileUseCase,
    private readonly upsertMemberProfileUseCase: UpsertMemberProfileUseCase,
    private readonly logWeightUseCase: LogWeightUseCase,
    private readonly listWeightLogsUseCase: ListWeightLogsUseCase,
    private readonly suspendMemberUseCase: SuspendMemberUseCase,
    private readonly reactivateMemberUseCase: ReactivateMemberUseCase,
    private readonly getMemberQrUseCase: GetMemberQrUseCase,
    private readonly registerDeviceTokenUseCase: RegisterDeviceTokenUseCase,
    private readonly updateMyPrivacyUseCase: UpdateMyPrivacyUseCase,
    private readonly removeMemberUseCase: RemoveMemberUseCase,
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
   * POST /gyms/:gymId/members/bulk-invite/validate
   * Parse an uploaded .xlsx/.csv and return a preview (ready/skip/invalid). No writes.
   * Requires members.create permission.
   */
  @Post('bulk-invite/validate')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        const ok = /\.(xlsx|xls|csv)$/i.test(file.originalname);
        cb(ok ? null : new BadRequestException('Upload an .xlsx or .csv file'), ok);
      },
    }),
  )
  validateBulkInvite(
    @Param('gymId') gymId: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    if (!file) throw new BadRequestException('A spreadsheet file is required');
    return this.validateBulkInviteUseCase.execute(gymId, file.buffer, user);
  }

  /**
   * POST /gyms/:gymId/members/bulk-invite
   * Bulk-create the given members and queue their invite emails (sent asynchronously).
   * Requires members.create permission.
   */
  @Post('bulk-invite')
  @HttpCode(HttpStatus.OK)
  bulkInvite(
    @Param('gymId') gymId: string,
    @Body() dto: BulkInviteDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.bulkInviteMembersUseCase.execute(gymId, dto.members, user);
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
   * GET /gyms/:gymId/members/expiring?days=7
   * Active memberships ending within `days` (gym's local dates) plus the expired count.
   * Requires members.renew. Declared before :memberId to avoid a route conflict.
   */
  @Get('expiring')
  expiring(
    @Param('gymId') gymId: string,
    @Query() query: ExpiringMembersQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.getExpiringMembershipsUseCase.execute(gymId, query.days, user);
  }

  /**
   * GET /gyms/:gymId/members/me
   * Get the authenticated member's own record. No members.view required.
   * Must be declared before :memberId to avoid route conflict.
   */
  @Get('me')
  getMe(
    @Param('gymId') gymId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.getMyMemberUseCase.execute(gymId, user);
  }

  /**
   * GET /gyms/:gymId/members/me/profile
   * Get authenticated member's fitness profile. No special permission required.
   * Must be declared before :memberId.
   */
  @Get('me/profile')
  getMyProfile(
    @Param('gymId') gymId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.getMyProfileUseCase.execute(gymId, user);
  }

  /**
   * PATCH /gyms/:gymId/members/me/profile
   * Upsert authenticated member's fitness profile.
   */
  @Patch('me/profile')
  @HttpCode(HttpStatus.OK)
  upsertMyProfile(
    @Param('gymId') gymId: string,
    @Body() dto: UpsertMyProfileDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.upsertMyProfileUseCase.execute(gymId, dto, user);
  }

  /**
   * POST /gyms/:gymId/members/me/device-token
   * Register or refresh the Expo push token for the authenticated user.
   */
  @Post('me/device-token')
  @HttpCode(HttpStatus.NO_CONTENT)
  registerDeviceToken(
    @Body() dto: RegisterDeviceTokenDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.registerDeviceTokenUseCase.execute(dto, user);
  }

  /**
   * PATCH /gyms/:gymId/members/me/privacy
   * Update the caller's privacy flags. Currently supports:
   *   - hideCheckinVisibility: hide identity in the public "who's checked in" view
   *   - hideFromMemberList:    hide from staff member search results
   * Returns the updated privacy row.
   */
  @Patch('me/privacy')
  @HttpCode(HttpStatus.OK)
  updateMyPrivacy(
    @Param('gymId') gymId: string,
    @Body() dto: UpdateMyPrivacyDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.updateMyPrivacyUseCase.execute(gymId, dto, user);
  }

  /**
   * POST /gyms/:gymId/members/me/delete-account
   * The caller deletes their own member account (needs their password). Personal, health and chat
   * data is deleted; renewals and check-ins stay without a name. A staff or owner login stays.
   */
  @Post('me/delete-account')
  @HttpCode(HttpStatus.OK)
  deleteMyAccount(
    @Param('gymId') gymId: string,
    @Body() dto: DeleteMyAccountDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.deleteMyAccountUseCase.execute(gymId, dto.password, user);
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

  /**
   * DELETE /gyms/:gymId/members/:memberId
   * Permanently remove a member. Deletes their check-ins and renewals, then the
   * gym_member record. If the user has no remaining memberships or staff records
   * their user account is also deleted, freeing the email for reuse.
   * Requires members.delete permission.
   */
  @Delete(':memberId')
  @HttpCode(HttpStatus.OK)
  remove(
    @Param('gymId') gymId: string,
    @Param('memberId') memberId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.removeMemberUseCase.execute(gymId, memberId, user);
  }

  /**
   * GET /gyms/:gymId/members/:memberId/profile
   * Get a member's fitness profile. Requires members.view permission.
   */
  @Get(':memberId/profile')
  getMemberProfile(
    @Param('gymId') gymId: string,
    @Param('memberId') memberId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.getMemberProfileUseCase.execute(gymId, memberId, user);
  }

  /**
   * PATCH /gyms/:gymId/members/:memberId/profile
   * Update a member's fitness profile. Requires members.edit permission.
   */
  @Patch(':memberId/profile')
  @HttpCode(HttpStatus.OK)
  upsertMemberProfile(
    @Param('gymId') gymId: string,
    @Param('memberId') memberId: string,
    @Body() dto: UpsertMyProfileDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.upsertMemberProfileUseCase.execute(gymId, memberId, dto, user);
  }

  /**
   * POST /gyms/:gymId/members/:memberId/weight-logs
   * Log a weight entry for a member.
   */
  @Post(':memberId/weight-logs')
  @HttpCode(HttpStatus.CREATED)
  logWeight(
    @Param('gymId') gymId: string,
    @Param('memberId') memberId: string,
    @Body() dto: LogWeightDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.logWeightUseCase.execute(gymId, memberId, dto, user);
  }

  /**
   * GET /gyms/:gymId/members/:memberId/weight-logs
   * List weight log history for a member. Requires members.view permission.
   */
  @Get(':memberId/weight-logs')
  listWeightLogs(
    @Param('gymId') gymId: string,
    @Param('memberId') memberId: string,
    @Query('limit') limit: string | undefined,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.listWeightLogsUseCase.execute(
      gymId,
      memberId,
      user,
      limit ? Math.min(parseInt(limit, 10), 200) : 50,
    );
  }
}
