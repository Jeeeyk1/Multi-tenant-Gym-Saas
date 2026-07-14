import { MarkInvoicePaidUseCase } from './mark-invoice-paid.use-case';
import type { BillingRepository } from '../../infrastructure/persistence/billing.repository';
import type { CacheService } from '../../../../common/cache/cache.service';
import { InvoiceStatus } from '../../../../common/enums';

const repo = {
  findInvoiceById: jest.fn(),
  markInvoicePaid: jest.fn(),
} as unknown as jest.Mocked<BillingRepository>;
const cache = { del: jest.fn() } as unknown as jest.Mocked<CacheService>;

describe('MarkInvoicePaidUseCase', () => {
  let useCase: MarkInvoicePaidUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new MarkInvoicePaidUseCase(repo, cache);
  });

  it('marks the invoice paid, activates, and busts the status cache for every gym in the org', async () => {
    repo.findInvoiceById.mockResolvedValue({ id: 'inv-1', organizationId: 'org-1', subscriptionId: 'sub-1', status: InvoiceStatus.AWAITING_VERIFICATION } as never);
    repo.markInvoicePaid.mockResolvedValue({ invoice: { id: 'inv-1', status: 'PAID', organizationId: 'org-1' }, gymIds: ['gym-1', 'gym-2'] } as never);

    await useCase.execute('inv-1', 'admin-1');

    expect(repo.markInvoicePaid).toHaveBeenCalledWith('inv-1', 'sub-1', 'admin-1');
    expect(cache.del).toHaveBeenCalledWith('sub:status:gym-1');
    expect(cache.del).toHaveBeenCalledWith('sub:status:gym-2');
  });

  it('is idempotent — an already-paid invoice is a no-op', async () => {
    repo.findInvoiceById.mockResolvedValue({ id: 'inv-1', organizationId: 'org-1', subscriptionId: 'sub-1', status: InvoiceStatus.PAID } as never);

    const result = await useCase.execute('inv-1');

    expect(result).toEqual({ id: 'inv-1', status: InvoiceStatus.PAID });
    expect(repo.markInvoicePaid).not.toHaveBeenCalled();
  });

  it('throws when the invoice does not exist', async () => {
    repo.findInvoiceById.mockResolvedValue(null);
    await expect(useCase.execute('missing')).rejects.toMatchObject({ code: 'INVOICE_NOT_FOUND' });
  });
});
