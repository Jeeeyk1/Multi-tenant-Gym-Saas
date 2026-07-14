import { Injectable } from '@nestjs/common';
import { ConflictError, ForbiddenError, NotFoundError } from '../../../../common/errors';
import { InvoiceStatus } from '../../../../common/enums';
import { BillingRepository } from '../../infrastructure/persistence/billing.repository';
import type { AuthenticatedUser } from '../../../../common/types/auth.types';

export interface SubmitPaymentInput {
  reference: string;
  method?: string;
}

@Injectable()
export class SubmitPaymentUseCase {
  constructor(private readonly repo: BillingRepository) {}

  async execute(gymId: string, invoiceId: string, input: SubmitPaymentInput, caller: AuthenticatedUser) {
    assertGymAccess(caller, gymId);
    assertPermission(caller, 'billing.manage');

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

function assertGymAccess(caller: AuthenticatedUser, gymId: string) {
  if (caller.type === 'gym' && caller.gymId !== gymId) {
    throw new ForbiddenError('Access denied to this gym', 'GYM_ACCESS_DENIED');
  }
}

function assertPermission(caller: AuthenticatedUser, permission: string) {
  if (caller.type === 'gym' && !caller.permissions.includes(permission)) {
    throw new ForbiddenError(`Missing permission: ${permission}`, 'PERMISSION_DENIED');
  }
}
