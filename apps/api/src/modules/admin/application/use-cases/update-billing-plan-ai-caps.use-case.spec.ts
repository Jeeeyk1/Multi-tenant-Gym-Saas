import { UpdateBillingPlanAiCapsUseCase } from './update-billing-plan-ai-caps.use-case';
import type { AdminRepository } from '../../infrastructure/persistence/admin.repository';
import { NotFoundError } from '../../../../common/errors';

const repo = {
  findBillingPlan: jest.fn(),
  updateBillingPlanAiCaps: jest.fn(),
} as unknown as jest.Mocked<AdminRepository>;

describe('UpdateBillingPlanAiCapsUseCase', () => {
  let useCase: UpdateBillingPlanAiCapsUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new UpdateBillingPlanAiCapsUseCase(repo);
  });

  it('stores dollar caps as micros', async () => {
    repo.findBillingPlan.mockResolvedValue({ id: 'plan-1', assistantAiCapUsdMicros: 2_500_000, memberAiCapUsdMicros: 3_500_000 } as never);
    repo.updateBillingPlanAiCaps.mockResolvedValue({ id: 'plan-1', tier: 'STARTER' } as never);

    await useCase.execute('plan-1', { assistantAiCapUsd: 1.5, memberAiCapUsd: 0.07 }, 'admin-1');

    expect(repo.updateBillingPlanAiCaps).toHaveBeenCalledWith('plan-1', {
      assistantAiCapUsdMicros: 1_500_000,
      memberAiCapUsdMicros: 70_000,
    });
  });

  it('allows a zero cap, which turns that pool off', async () => {
    repo.findBillingPlan.mockResolvedValue({ id: 'plan-1', assistantAiCapUsdMicros: 2_500_000, memberAiCapUsdMicros: 3_500_000 } as never);
    repo.updateBillingPlanAiCaps.mockResolvedValue({ id: 'plan-1', tier: 'STARTER' } as never);

    await useCase.execute('plan-1', { assistantAiCapUsd: 0, memberAiCapUsd: 2 }, 'admin-1');

    expect(repo.updateBillingPlanAiCaps).toHaveBeenCalledWith('plan-1', {
      assistantAiCapUsdMicros: 0,
      memberAiCapUsdMicros: 2_000_000,
    });
  });

  it('throws NotFoundError for an unknown plan', async () => {
    repo.findBillingPlan.mockResolvedValue(null);

    await expect(useCase.execute('nope', { assistantAiCapUsd: 1, memberAiCapUsd: 1 }, 'admin-1')).rejects.toThrow(
      NotFoundError,
    );
    expect(repo.updateBillingPlanAiCaps).not.toHaveBeenCalled();
  });
});
