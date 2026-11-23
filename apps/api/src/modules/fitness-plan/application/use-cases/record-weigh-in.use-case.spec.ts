import { RecordWeighInUseCase } from './record-weigh-in.use-case';
import { FitnessDirection, GoalPace } from '../../../../common/enums';
import type {
  FitnessPlanMember,
  FitnessPlanRepository,
} from '../../infrastructure/persistence/fitness-plan.repository';

const mockRepo = {
  findMember: jest.fn(),
  createPlan: jest.fn(),
  findLatestPlan: jest.fn(),
  findPlanActiveAt: jest.fn(),
  dayBounds: jest.fn(),
  sumFoodLogs: jest.fn(),
  recordWeighIn: jest.fn(),
} as unknown as jest.Mocked<FitnessPlanRepository>;

function member(weightKg: number, profile: Partial<NonNullable<FitnessPlanMember['profile']>> = {}): FitnessPlanMember {
  return {
    memberId: 'member-1',
    gymId: 'gym-1',
    timezone: 'Asia/Manila',
    profile: {
      sex: 'MALE',
      age: 30,
      heightCm: 180,
      weightKg,
      targetWeightKg: 70,
      activityLevel: 'MODERATE',
      fitnessGoal: 'LOSE_WEIGHT',
      healthCaution: false,
      healthDataConsentAt: new Date('2026-11-01T00:00:00Z'),
      ...profile,
    },
  };
}

// The active plan was made at 80 kg, losing toward 70 kg at the FAST pace.
const activePlan = {
  id: 'plan-1',
  direction: FitnessDirection.LOSS,
  goalPace: GoalPace.FAST,
  weightKg: '80.00',
  targetWeightKg: '70.00',
  weeklyRateKg: '-0.75',
  targetDate: new Date('2027-03-01T00:00:00Z'),
};

describe('RecordWeighInUseCase', () => {
  let useCase: RecordWeighInUseCase;

  function weighIn(kg: number) {
    mockRepo.findMember.mockResolvedValue(member(kg));
    mockRepo.recordWeighIn.mockResolvedValue({ weightKg: kg, loggedAt: new Date() });
    return useCase.execute('gym-1', 'member-1', kg);
  }

  beforeEach(() => {
    jest.resetAllMocks();
    mockRepo.findLatestPlan.mockResolvedValue(activePlan as never);
    mockRepo.createPlan.mockImplementation(async (data) => ({ ...activePlan, ...data, targetDate: null }) as never);
    useCase = new RecordWeighInUseCase(mockRepo);
  });

  it('logs the weight and keeps the plan for small changes', async () => {
    const result = await weighIn(79);
    expect(mockRepo.recordWeighIn).toHaveBeenCalledWith('member-1', 79);
    expect(result).toMatchObject({ planUpdated: false, goalReached: false });
    expect(mockRepo.createPlan).not.toHaveBeenCalled();
  });

  it('recalculates at the same pace once weight moves 2 kg or more', async () => {
    const result = await weighIn(77.5);
    expect(mockRepo.createPlan).toHaveBeenCalledWith(
      expect.objectContaining({ weightKg: 77.5, goalPace: GoalPace.FAST, direction: FitnessDirection.LOSS }),
    );
    expect(result.planUpdated).toBe(true);
  });

  it('reports the goal as reached and leaves the plan alone', async () => {
    const result = await weighIn(69.5);
    expect(result).toMatchObject({ goalReached: true, planUpdated: false });
    expect(mockRepo.createPlan).not.toHaveBeenCalled();
  });

  it('counts a weigh-in within 0.5 kg of the goal as reached', async () => {
    const result = await weighIn(70.3);
    expect(result).toMatchObject({ goalReached: true, planUpdated: false });
  });

  it('still saves the weigh-in when the profile can no longer produce a plan', async () => {
    mockRepo.recordWeighIn.mockResolvedValue({ weightKg: 77, loggedAt: new Date() });
    mockRepo.findMember.mockResolvedValue(member(77, { healthDataConsentAt: null }));
    const result = await useCase.execute('gym-1', 'member-1', 77);
    expect(mockRepo.recordWeighIn).toHaveBeenCalled();
    expect(result.planUpdated).toBe(false);
  });

  it('just logs the weight when there is no plan', async () => {
    mockRepo.findLatestPlan.mockResolvedValue(null);
    const result = await weighIn(75);
    expect(result).toMatchObject({ plan: null, planUpdated: false, goalReached: false });
  });

  it('returns not found for a member outside the gym', async () => {
    mockRepo.findMember.mockResolvedValue(null);
    await expect(useCase.execute('gym-2', 'member-1', 75)).rejects.toMatchObject({ code: 'MEMBER_NOT_FOUND' });
    expect(mockRepo.recordWeighIn).not.toHaveBeenCalled();
  });
});
