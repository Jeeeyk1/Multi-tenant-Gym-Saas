import { GetDailyNutritionUseCase } from './get-daily-nutrition.use-case';
import type { FitnessPlanRepository } from '../../infrastructure/persistence/fitness-plan.repository';

const mockRepo = {
  findMember: jest.fn(),
  createPlan: jest.fn(),
  findLatestPlan: jest.fn(),
  findPlanActiveAt: jest.fn(),
  dayBounds: jest.fn(),
  sumFoodLogs: jest.fn(),
} as unknown as jest.Mocked<FitnessPlanRepository>;

const totals = { entries: 2, kcal: 900, proteinG: 60, carbsG: 100, fatG: 25 };
const range = { start: new Date('2026-11-30T16:00:00Z'), end: new Date('2026-12-01T16:00:00Z') };

describe('GetDailyNutritionUseCase', () => {
  let useCase: GetDailyNutritionUseCase;

  beforeEach(() => {
    jest.resetAllMocks();
    mockRepo.findMember.mockResolvedValue({
      memberId: 'member-1',
      gymId: 'gym-1',
      timezone: 'Asia/Manila',
      profile: null,
    });
    mockRepo.dayBounds.mockResolvedValue(range);
    mockRepo.sumFoodLogs.mockResolvedValue(totals);
    useCase = new GetDailyNutritionUseCase(mockRepo);
  });

  it('compares what was eaten with the plan active on that day', async () => {
    mockRepo.findPlanActiveAt.mockResolvedValue({
      targetKcal: 2200,
      proteinG: 140,
      carbsG: 250,
      fatG: 60,
      waterMl: 2800,
    } as never);

    const result = await useCase.execute('gym-1', 'member-1', '2026-12-01');

    expect(mockRepo.dayBounds).toHaveBeenCalledWith('2026-12-01', 'Asia/Manila');
    expect(mockRepo.sumFoodLogs).toHaveBeenCalledWith('member-1', range);
    expect(mockRepo.findPlanActiveAt).toHaveBeenCalledWith('member-1', range.end);
    expect(result).toEqual({
      date: '2026-12-01',
      entries: 2,
      eaten: { kcal: 900, proteinG: 60, carbsG: 100, fatG: 25 },
      targets: { kcal: 2200, proteinG: 140, carbsG: 250, fatG: 60, waterMl: 2800 },
      remaining: { kcal: 1300, proteinG: 80, carbsG: 150, fatG: 35 },
    });
  });

  it('returns totals without targets when there is no plan', async () => {
    mockRepo.findPlanActiveAt.mockResolvedValue(null);
    const result = await useCase.execute('gym-1', 'member-1', '2026-12-01');
    expect(result.targets).toBeNull();
    expect(result.remaining).toBeNull();
  });

  it("defaults to today in the gym's timezone", async () => {
    mockRepo.findPlanActiveAt.mockResolvedValue(null);
    const result = await useCase.execute('gym-1', 'member-1');
    expect(result.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('returns not found for a member outside the gym', async () => {
    mockRepo.findMember.mockResolvedValue(null);
    await expect(useCase.execute('gym-2', 'member-1')).rejects.toMatchObject({ code: 'MEMBER_NOT_FOUND' });
  });
});
