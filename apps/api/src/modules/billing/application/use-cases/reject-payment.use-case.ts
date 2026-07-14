import { Injectable } from '@nestjs/common';
import { ConflictError, NotFoundError } from '../../../../common/errors';
import { InvoiceStatus } from '../../../../common/enums';
import { BillingRepository } from '../../infrastructure/persistence/billing.repository';

/** Admin rejects a submitted payment reference → invoice back to OPEN so the owner resubmits. */
@Injectable()
export class RejectPaymentUseCase {
  constructor(private readonly repo: BillingRepository) {}

  async execute(invoiceId: string, reason: string) {
    const invoice = await this.repo.findInvoiceById(invoiceId);
    if (!invoice) throw new NotFoundError('Invoice not found', 'INVOICE_NOT_FOUND');
    if (invoice.status !== InvoiceStatus.AWAITING_VERIFICATION) {
      throw new ConflictError('Invoice is not awaiting verification', 'INVOICE_NOT_AWAITING');
    }
    return this.repo.rejectPayment(invoiceId, reason);
  }
}
