import {
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
  UseGuards,
} from '@nestjs/common';
import { SystemAdminGuard } from '../guards/system-admin.guard';
import { GetPlatformStatsUseCase } from '../../application/use-cases/get-platform-stats.use-case';
import { ListGymsUseCase } from '../../application/use-cases/list-gyms.use-case';
import { GetGymDetailUseCase } from '../../application/use-cases/get-gym-detail.use-case';
import { CreateGymClientUseCase } from '../../application/use-cases/create-gym-client.use-case';
import { UpdateGymStatusUseCase } from '../../application/use-cases/update-gym-status.use-case';
import { ListUsersUseCase } from '../../application/use-cases/list-users.use-case';
import { ListPlansUseCase } from '../../application/use-cases/list-plans.use-case';
import { ListBillingPlansUseCase } from '../../application/use-cases/list-billing-plans.use-case';
import { CreatePlanUseCase } from '../../application/use-cases/create-plan.use-case';
import { UpdatePlanUseCase } from '../../application/use-cases/update-plan.use-case';
import { DeletePlanUseCase } from '../../application/use-cases/delete-plan.use-case';
import { ResendInviteUseCase } from '../../application/use-cases/resend-invite.use-case';
import { MarkInvoicePaidUseCase } from '../../../billing/application/use-cases/mark-invoice-paid.use-case';
import { RejectPaymentUseCase } from '../../../billing/application/use-cases/reject-payment.use-case';
import { BillingRepository } from '../../../billing/infrastructure/persistence/billing.repository';
import { ListSignupRequestsUseCase } from '../../../leads/application/use-cases/list-signup-requests.use-case';
import { GetSignupRequestUseCase } from '../../../leads/application/use-cases/get-signup-request.use-case';
import { UpdateSignupRequestStatusUseCase } from '../../../leads/application/use-cases/update-signup-request-status.use-case';
import { ConvertSignupRequestUseCase } from '../../../leads/application/use-cases/convert-signup-request.use-case';
import { UpdateSignupRequestStatusDto } from '../../../leads/presentation/dto/update-signup-request-status.dto';
import { ConvertSignupRequestDto } from '../../../leads/presentation/dto/convert-signup-request.dto';
import { CreateGymClientDto } from '../dto/create-gym-client.dto';
import { UpdateGymStatusDto } from '../dto/update-gym-status.dto';
import { CreatePlanDto } from '../dto/create-plan.dto';
import { UpdatePlanDto } from '../dto/update-plan.dto';
import { RejectPaymentDto } from '../dto/reject-payment.dto';

@Controller('admin')
@UseGuards(SystemAdminGuard)
export class AdminController {
  constructor(
    private readonly getStats: GetPlatformStatsUseCase,
    private readonly listGyms: ListGymsUseCase,
    private readonly getGymDetail: GetGymDetailUseCase,
    private readonly createGymClient: CreateGymClientUseCase,
    private readonly updateGymStatus: UpdateGymStatusUseCase,
    private readonly listUsers: ListUsersUseCase,
    private readonly listPlans: ListPlansUseCase,
    private readonly listBillingPlans: ListBillingPlansUseCase,
    private readonly createPlan: CreatePlanUseCase,
    private readonly updatePlan: UpdatePlanUseCase,
    private readonly deletePlan: DeletePlanUseCase,
    private readonly resendInvite: ResendInviteUseCase,
    private readonly markInvoicePaid: MarkInvoicePaidUseCase,
    private readonly rejectPayment: RejectPaymentUseCase,
    private readonly billing: BillingRepository,
    private readonly listSignupRequests: ListSignupRequestsUseCase,
    private readonly getSignupRequest: GetSignupRequestUseCase,
    private readonly updateSignupRequestStatus: UpdateSignupRequestStatusUseCase,
    private readonly convertSignupRequest: ConvertSignupRequestUseCase,
  ) {}

  // ── Lead capture (signup requests) ────────────────────────────────────────

  /** GET /admin/signup-requests — the lead queue, newest first. */
  @Get('signup-requests')
  signupRequests() {
    return this.listSignupRequests.execute();
  }

  /** GET /admin/signup-requests/:id — prefill data for the "Convert" flow. */
  @Get('signup-requests/:id')
  signupRequest(@Param('id') id: string) {
    return this.getSignupRequest.execute(id);
  }

  /** PATCH /admin/signup-requests/:id/status — mark CONTACTED or REJECTED. */
  @Patch('signup-requests/:id/status')
  @HttpCode(HttpStatus.OK)
  updateSignupRequestStatusAction(@Param('id') id: string, @Body() dto: UpdateSignupRequestStatusDto) {
    return this.updateSignupRequestStatus.execute(id, dto.status, dto.notes);
  }

  /** POST /admin/signup-requests/:id/convert — link the gym created for this lead. */
  @Post('signup-requests/:id/convert')
  @HttpCode(HttpStatus.OK)
  convertSignupRequestAction(@Param('id') id: string, @Body() dto: ConvertSignupRequestDto) {
    return this.convertSignupRequest.execute(id, dto.gymId);
  }

  // ── Billing / payment verification ────────────────────────────────────────

  /** GET /admin/payments/pending — invoices awaiting manual verification. */
  @Get('payments/pending')
  pendingPayments() {
    return this.billing.listPendingPayments();
  }

  /** GET /admin/invoices — the full invoice ledger, paginated, newest first. */
  @Get('invoices')
  invoices(
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    return this.billing.listAllInvoices(+page, +limit);
  }

  /** POST /admin/invoices/:id/verify — confirm payment → activate the subscription. */
  @Post('invoices/:id/verify')
  @HttpCode(HttpStatus.OK)
  verifyPayment(@Param('id') id: string) {
    return this.markInvoicePaid.execute(id);
  }

  /** POST /admin/invoices/:id/reject — reject the submitted reference; owner resubmits. */
  @Post('invoices/:id/reject')
  @HttpCode(HttpStatus.OK)
  rejectPaymentAction(@Param('id') id: string, @Body() dto: RejectPaymentDto) {
    return this.rejectPayment.execute(id, dto.reason);
  }

  @Get('stats')
  stats() {
    return this.getStats.execute();
  }

  @Get('gyms')
  gyms(
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    return this.listGyms.execute(+page, +limit);
  }

  @Get('gyms/:id')
  gym(@Param('id') id: string) {
    return this.getGymDetail.execute(id);
  }

  /** GET /admin/billing-plans — active billing plans a gym can be provisioned onto. */
  @Get('billing-plans')
  billingPlans() {
    return this.listBillingPlans.execute();
  }

  @Post('gyms')
  @HttpCode(HttpStatus.CREATED)
  createGym(@Body() dto: CreateGymClientDto) {
    return this.createGymClient.execute({
      gymName: dto.gymName,
      gymCode: dto.gymCode,
      ownerEmail: dto.ownerEmail,
      ownerFullName: dto.ownerFullName,
      planId: dto.planId,
      billingCycle: dto.billingCycle,
    });
  }

  @Patch('gyms/:id/status')
  @HttpCode(HttpStatus.OK)
  updateStatus(@Param('id') id: string, @Body() dto: UpdateGymStatusDto) {
    return this.updateGymStatus.execute(id, dto.status);
  }

  @Post('gyms/:id/resend-invite')
  @HttpCode(HttpStatus.OK)
  resendGymOwnerInvite(@Param('id') id: string) {
    return this.resendInvite.execute(id);
  }

  @Get('users')
  users(
    @Query('page') page = '1',
    @Query('limit') limit = '20',
    @Query('gymId') gymId?: string,
  ) {
    return this.listUsers.execute(+page, +limit, gymId);
  }

  @Get('plans')
  plans() {
    return this.listPlans.execute();
  }

  @Post('plans')
  @HttpCode(HttpStatus.CREATED)
  createNewPlan(@Body() dto: CreatePlanDto) {
    return this.createPlan.execute(dto);
  }

  @Patch('plans/:id')
  @HttpCode(HttpStatus.OK)
  patchPlan(@Param('id') id: string, @Body() dto: UpdatePlanDto) {
    return this.updatePlan.execute(id, dto);
  }

  @Delete('plans/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  removePlan(@Param('id') id: string) {
    return this.deletePlan.execute(id);
  }
}
