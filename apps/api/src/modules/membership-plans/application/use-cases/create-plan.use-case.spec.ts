import { CreatePlanUseCase } from './create-plan.use-case';
import type { MembershipPlansRepository } from '../../infrastructure/persistence/membership-plans.repository';
import type { AuthenticatedUser } from '../../../../common/types/auth.types';

const mockRepo = {
  create: jest.fn(),
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
  permissions: ['gym.settings', 'members.view'],
};

const input = {
  name: 'Monthly Plan',
  type: 'MONTHLY',
  price: 1500,
  durationDays: 30,
};

describe('CreatePlanUseCase', () => {
  let useCase: CreatePlanUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new CreatePlanUseCase(mockRepo);
    mockRepo.create.mockResolvedValue({ id: 'plan-1', ...input, isActive: true } as any);
  });

  it('creates a plan for org-level caller', async () => {
    await useCase.execute('gym-1', input, orgCaller);
    expect(mockRepo.create).toHaveBeenCalledWith({ gymId: 'gym-1', ...input });
  });

  it('creates a plan for gym-level caller with gym.settings', async () => {
    await useCase.execute('gym-1', input, gymCaller);
    expect(mockRepo.create).toHaveBeenCalledWith({ gymId: 'gym-1', ...input });
  });

  it('throws ForbiddenError when gym-level caller targets another gym', async () => {
    await expect(useCase.execute('gym-2', input, gymCaller)).rejects.toMatchObject({
      code: 'GYM_ACCESS_DENIED',
    });
  });

  it('throws ForbiddenError when caller lacks gym.settings permission', async () => {
    const limited: AuthenticatedUser = { ...gymCaller, permissions: ['members.view'] };
    await expect(useCase.execute('gym-1', input, limited)).rejects.toMatchObject({
      code: 'PERMISSION_DENIED',
    });
  });
});
