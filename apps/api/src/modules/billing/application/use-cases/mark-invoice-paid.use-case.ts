import { Injectable } from '@nestjs/common';
import { NotFoundError } from '../../../../common/errors';
import { InvoiceStatus } from '../../../../common/enums';
import { CacheService } from '../../../../common/cache/cache.service';
import { BillingRepository } from '../../infrastructure/persistence/billing.repository';

/**
 * The single seam that confirms payment → activates the subscription. Called today by the
 * admin "verify payment" action; later by a payment-gateway webhook. Nothing downstream
 * depends on WHICH triggered it. Idempotent.
 */
@Injectable()
export class MarkInvoicePaidUseCase {
  constructor(
    private readonly repo: BillingRepository,
    private readonly cache: CacheService,
  ) {}

  async execute(invoiceId: string, verifiedBy?: string) {
    const invoice = await this.repo.findInvoiceById(invoiceId);
    if (!invoice) throw new NotFoundError('Invoice not found', 'INVOICE_NOT_FOUND');
    if (invoice.status === InvoiceStatus.PAID) {
      return { id: invoice.id, status: InvoiceStatus.PAID };
    }

    const { invoice: paid, gymIds } = await this.repo.markInvoicePaid(
      invoiceId,
      invoice.subscriptionId,
      verifiedBy,
    );

    // Subscription status just changed → bust the cache the SubscriptionGuard reads.
    await Promise.all(gymIds.map((gymId) => this.cache.del(`sub:status:${gymId}`)));

    return paid;
  }
}
