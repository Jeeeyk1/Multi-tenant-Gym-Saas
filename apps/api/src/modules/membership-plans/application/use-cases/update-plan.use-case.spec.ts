import { UpdatePlanUseCase } from './update-plan.use-case';
import type { MembershipPlansRepository } from '../../infrastructure/persistence/membership-plans.repository';
import type { AuthenticatedUser } from '../../../../common/types/auth.types';

const mockRepo = {
  findById: jest.fn(),
  update: jest.fn(),
} as unknown as jest.Mocked<MembershipPlansRepository>;

const orgCaller: AuthenticatedUser = {
  type: 'org',
  sub: 'user-1',
  organizationId: 'org-1',
  orgRole: 'OWNER',
};

const gymCaller: AuthenticatedUser = {
  type: 'gym',
  sub: 'user-2',
  gymId: 'gym-1',
  roles: ['MANAGER'],
  permissions: ['gym.settings'],
};

const existingPlan = {
  id: 'plan-1',
  gymId: 'gym-1',
  name: 'Monthly Plan',
  type: 'MONTHLY',
  price: 1500,
  durationDays: 30,
  isActive: true,
};

describe('UpdatePlanUseCase', () => {
  let useCase: UpdatePlanUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new UpdatePlanUseCase(mockRepo);
    mockRepo.findById.mockResolvedValue(existingPlan as any);
    mockRepo.update.mockResolvedValue({ ...existingPlan, name: 'Updated Plan' } as any);
  });

  it('updates a plan for org-level caller', async () => {
    await useCase.execute('gym-1', 'plan-1', { name: 'Updated Plan' }, orgCaller);
    expect(mockRepo.update).toHaveBeenCalledWith('plan-1', { name: 'Updated Plan' });
  });

  it('updates a plan for gym-level caller with gym.settings', async () => {
    await useCase.execute('gym-1', 'plan-1', { isActive: false }, gymCaller);
    expect(mockRepo.update).toHaveBeenCalledWith('plan-1', { isActive: false });
  });

  it('throws NotFoundError when plan does not belong to gym', async () => {
    mockRepo.findById.mockResolvedValue(null);
    await expect(useCase.execute('gym-1', 'plan-999', {}, orgCaller)).rejects.toMatchObject({
      code: 'PLAN_NOT_FOUND',
    });
  });

  it('throws ForbiddenError when gym-level caller targets another gym', async () => {
    await expect(useCase.execute('gym-2', 'plan-1', {}, gymCaller)).rejects.toMatchObject({
      code: 'GYM_ACCESS_DENIED',
    });
  });

  it('throws ForbiddenError when caller lacks gym.settings permission', async () => {
    const limited: AuthenticatedUser = { ...gymCaller, permissions: ['members.view'] };
    await expect(useCase.execute('gym-1', 'plan-1', {}, limited)).rejects.toMatchObject({
      code: 'PERMISSION_DENIED',
    });
  });
});
