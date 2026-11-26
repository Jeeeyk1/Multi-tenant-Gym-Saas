import { Injectable } from '@nestjs/common';
import { ConflictError, NotFoundError } from '../../../../common/errors';
import { InvoiceStatus, Permission } from '../../../../common/enums';
import { BillingRepository } from '../../infrastructure/persistence/billing.repository';
import type { AuthenticatedUser } from '../../../../common/types/auth.types';
import { assertGymAccess, assertPermission } from '../../../../common/auth/authorization';

export interface SubmitPaymentInput {
  reference: string;
  method?: string;
}

@Injectable()
export class SubmitPaymentUseCase {
  constructor(private readonly repo: BillingRepository) {}

  async execute(gymId: string, invoiceId: string, input: SubmitPaymentInput, caller: AuthenticatedUser) {
    assertGymAccess(caller, gymId);
    assertPermission(caller, Permission.BILLING_MANAGE);

    const org = await this.repo.getOrgIdByGym(gymId);
    if (!org) throw new NotFoundError('Gym not found', 'GYM_NOT_FOUND');

    const invoice = await this.repo.findInvoiceById(invoiceId);
    if (!invoice || invoice.organizationId !== org.organizationId) {
      throw new NotFoundError('Invoice not found', 'INVOICE_NOT_FOUND');
    }
    if (invoice.status !== InvoiceStatus.OPEN) {
      throw new ConflictError(`Invoice is not open for payment (status: ${invoice.status})`, 'INVOICE_NOT_OPEN');
    }

    return this.repo.submitPayment(invoiceId, input.reference, input.method);
  }
}
