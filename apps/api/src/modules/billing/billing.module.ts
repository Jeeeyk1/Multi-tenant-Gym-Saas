import { Module } from '@nestjs/common';
import { BillingRepository } from './infrastructure/persistence/billing.repository';
import { GetMySubscriptionUseCase } from './application/use-cases/get-my-subscription.use-case';
import { SubmitPaymentUseCase } from './application/use-cases/submit-payment.use-case';
import { MarkInvoicePaidUseCase } from './application/use-cases/mark-invoice-paid.use-case';
import { RejectPaymentUseCase } from './application/use-cases/reject-payment.use-case';
import { ExtendTrialUseCase } from './application/use-cases/extend-trial.use-case';
import { BillingController } from './presentation/controllers/billing.controller';

@Module({
  controllers: [BillingController],
  providers: [
    BillingRepository,
    GetMySubscriptionUseCase,
    SubmitPaymentUseCase,
    MarkInvoicePaidUseCase,
    RejectPaymentUseCase,
    ExtendTrialUseCase,
  ],
  // Exported so the admin module can verify/reject payments, extend trials, and list pending ones.
  exports: [MarkInvoicePaidUseCase, RejectPaymentUseCase, ExtendTrialUseCase, BillingRepository],
})
export class BillingModule {}
