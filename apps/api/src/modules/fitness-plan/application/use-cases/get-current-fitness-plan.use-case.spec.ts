import { GetCurrentFitnessPlanUseCase } from './get-current-fitness-plan.use-case';
import type { FitnessPlanRepository } from '../../infrastructure/persistence/fitness-plan.repository';

const mockRepo = {
  findMember: jest.fn(),
  createPlan: jest.fn(),
  findLatestPlan: jest.fn(),
  findPlanActiveAt: jest.fn(),
  dayBounds: jest.fn(),
  sumFoodLogs: jest.fn(),
  recordWeighIn: jest.fn(),
} as unknown as jest.Mocked<FitnessPlanRepository>;

describe('GetCurrentFitnessPlanUseCase', () => {
  let useCase: GetCurrentFitnessPlanUseCase;

  beforeEach(() => {
    jest.resetAllMocks();
    mockRepo.findMember.mockResolvedValue({ memberId: 'member-1', gymId: 'gym-1', timezone: 'Asia/Manila', profile: null });
    useCase = new GetCurrentFitnessPlanUseCase(mockRepo);
  });

  it('returns the latest plan with plain numbers', async () => {
    mockRepo.findLatestPlan.mockResolvedValue({
      id: 'plan-1',
      weightKg: '80.00',
      targetWeightKg: null,
      weeklyRateKg: '0.00',
      targetDate: null,
    } as never);
    await expect(useCase.execute('gym-1', 'member-1')).resolves.toEqual({
      plan: { id: 'plan-1', weightKg: 80, targetWeightKg: null, weeklyRateKg: 0, targetDate: null },
    });
  });

  it('returns { plan: null } when nothing has been saved', async () => {
    mockRepo.findLatestPlan.mockResolvedValue(null);
    await expect(useCase.execute('gym-1', 'member-1')).resolves.toEqual({ plan: null });
  });

  it('returns not found for a member outside the gym', async () => {
    mockRepo.findMember.mockResolvedValue(null);
    await expect(useCase.execute('gym-2', 'member-1')).rejects.toMatchObject({ code: 'MEMBER_NOT_FOUND' });
  });
});
