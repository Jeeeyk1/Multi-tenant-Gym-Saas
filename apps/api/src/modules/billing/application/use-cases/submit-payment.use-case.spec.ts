import { SubmitPaymentUseCase } from './submit-payment.use-case';
import type { BillingRepository } from '../../infrastructure/persistence/billing.repository';
import type { AuthenticatedUser } from '../../../../common/types/auth.types';
import { InvoiceStatus } from '../../../../common/enums';

const repo = {
  getOrgIdByGym: jest.fn(),
  findInvoiceById: jest.fn(),
  submitPayment: jest.fn(),
} as unknown as jest.Mocked<BillingRepository>;

const owner: AuthenticatedUser = {
  type: 'gym',
  sub: 'owner-1',
  gymId: 'gym-1',
  roles: ['GYM_OWNER'],
  permissions: ['billing.manage'],
};

describe('SubmitPaymentUseCase', () => {
  let useCase: SubmitPaymentUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new SubmitPaymentUseCase(repo);
    repo.getOrgIdByGym.mockResolvedValue({ organizationId: 'org-1' } as never);
    repo.submitPayment.mockResolvedValue({ id: 'inv-1', status: InvoiceStatus.AWAITING_VERIFICATION } as never);
  });

  it('submits a reference against an OPEN invoice owned by the gym', async () => {
    repo.findInvoiceById.mockResolvedValue({ id: 'inv-1', organizationId: 'org-1', subscriptionId: 'sub-1', status: InvoiceStatus.OPEN } as never);
    await useCase.execute('gym-1', 'inv-1', { reference: 'GC12345', method: 'GCASH' }, owner);
    expect(repo.submitPayment).toHaveBeenCalledWith('inv-1', 'GC12345', 'GCASH');
  });

  it('rejects an invoice belonging to another org (tenancy)', async () => {
    repo.findInvoiceById.mockResolvedValue({ id: 'inv-1', organizationId: 'other-org', subscriptionId: 'sub-1', status: InvoiceStatus.OPEN } as never);
    await expect(useCase.execute('gym-1', 'inv-1', { reference: 'x' }, owner)).rejects.toMatchObject({ code: 'INVOICE_NOT_FOUND' });
    expect(repo.submitPayment).not.toHaveBeenCalled();
  });

  it('rejects a non-OPEN invoice (already submitted or paid)', async () => {
    repo.findInvoiceById.mockResolvedValue({ id: 'inv-1', organizationId: 'org-1', subscriptionId: 'sub-1', status: InvoiceStatus.AWAITING_VERIFICATION } as never);
    await expect(useCase.execute('gym-1', 'inv-1', { reference: 'x' }, owner)).rejects.toMatchObject({ code: 'INVOICE_NOT_OPEN' });
  });

  it('rejects a caller without billing.manage', async () => {
    const staff: AuthenticatedUser = { ...owner, permissions: ['members.view'] };
    await expect(useCase.execute('gym-1', 'inv-1', { reference: 'x' }, staff)).rejects.toMatchObject({ code: 'PERMISSION_DENIED' });
  });
});
