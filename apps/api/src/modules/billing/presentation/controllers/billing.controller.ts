import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../../../common/decorators/current-user.decorator';
import { GetMySubscriptionUseCase } from '../../application/use-cases/get-my-subscription.use-case';
import { SubmitPaymentUseCase } from '../../application/use-cases/submit-payment.use-case';
import { AllowInactiveSubscription } from '../../application/allow-inactive-subscription.decorator';
import { SubmitPaymentDto } from '../dto/submit-payment.dto';
import type { AuthenticatedUser } from '../../../../common/types/auth.types';

// The owner must reach these even while the gym is locked (PENDING_PAYMENT) — that's the point.
@Controller('gyms/:gymId/subscription')
@UseGuards(JwtAuthGuard)
@AllowInactiveSubscription()
export class BillingController {
  constructor(
    private readonly getMySubscription: GetMySubscriptionUseCase,
    private readonly submitPayment: SubmitPaymentUseCase,
  ) {}

  /** GET /gyms/:gymId/subscription — subscription + current invoice + payment instructions. */
  @Get()
  get(@Param('gymId') gymId: string, @CurrentUser() caller: AuthenticatedUser) {
    return this.getMySubscription.execute(gymId, caller);
  }

  /** POST /gyms/:gymId/subscription/invoices/:invoiceId/pay — submit a payment reference. */
  @Post('invoices/:invoiceId/pay')
  @HttpCode(HttpStatus.OK)
  pay(
    @Param('gymId') gymId: string,
    @Param('invoiceId') invoiceId: string,
    @Body() dto: SubmitPaymentDto,
    @CurrentUser() caller: AuthenticatedUser,
  ) {
    return this.submitPayment.execute(gymId, invoiceId, { reference: dto.reference, method: dto.method }, caller);
  }
}
