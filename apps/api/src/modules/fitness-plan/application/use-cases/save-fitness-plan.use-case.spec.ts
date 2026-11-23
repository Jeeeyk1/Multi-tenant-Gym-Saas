import { SaveFitnessPlanUseCase } from './save-fitness-plan.use-case';
import { GetFitnessPlanOptionsUseCase } from './get-fitness-plan-options.use-case';
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
} as unknown as jest.Mocked<FitnessPlanRepository>;

function member(profile: Partial<NonNullable<FitnessPlanMember['profile']>> = {}): FitnessPlanMember {
  return {
    memberId: 'member-1',
    gymId: 'gym-1',
    timezone: 'Asia/Manila',
    profile: {
      sex: 'MALE',
      age: 30,
      heightCm: 180,
      weightKg: 80,
      targetWeightKg: 70,
      activityLevel: 'MODERATE',
      fitnessGoal: 'LOSE_WEIGHT',
      healthCaution: false,
      healthDataConsentAt: new Date('2026-11-01T00:00:00Z'),
      ...profile,
    },
  };
}

const storedPlan = {
  id: 'plan-1',
  weightKg: '80.00',
  targetWeightKg: '70.00',
  weeklyRateKg: '-0.50',
  targetDate: new Date('2027-04-20T00:00:00Z'),
};

describe('SaveFitnessPlanUseCase', () => {
  let useCase: SaveFitnessPlanUseCase;

  beforeEach(() => {
    jest.resetAllMocks();
    mockRepo.findMember.mockResolvedValue(member());
    mockRepo.createPlan.mockResolvedValue(storedPlan as never);
    useCase = new SaveFitnessPlanUseCase(mockRepo);
  });

  it('stores the chosen pace with numbers recalculated on the server', async () => {
    const result = await useCase.execute('gym-1', 'member-1', GoalPace.BALANCED);

    expect(mockRepo.createPlan).toHaveBeenCalledWith(
      expect.objectContaining({
        memberId: 'member-1',
        gymId: 'gym-1',
        direction: FitnessDirection.LOSS,
        goalPace: GoalPace.BALANCED,
        targetKcal: 2210,
        proteinG: 144,
        weeklyRateKg: -0.5,
      }),
    );
    expect(result).toMatchObject({
      weightKg: 80,
      targetWeightKg: 70,
      weeklyRateKg: -0.5,
      targetDate: '2027-04-20',
      adviseProfessional: false,
    });
  });

  it('uses the recommended pace when none is given', async () => {
    await useCase.execute('gym-1', 'member-1');
    expect(mockRepo.createPlan).toHaveBeenCalledWith(expect.objectContaining({ goalPace: GoalPace.BALANCED }));
  });

  it('saves maintenance without a pace and rejects one if given', async () => {
    mockRepo.findMember.mockResolvedValue(member({ fitnessGoal: 'STAY_HEALTHY', targetWeightKg: null }));

    await useCase.execute('gym-1', 'member-1');
    expect(mockRepo.createPlan).toHaveBeenCalledWith(
      expect.objectContaining({ direction: FitnessDirection.MAINTAIN, goalPace: null, weeklyRateKg: 0 }),
    );

    await expect(useCase.execute('gym-1', 'member-1', GoalPace.FAST)).rejects.toMatchObject({
      code: 'PACE_NOT_APPLICABLE',
    });
  });

  it('rejects a pace that is not available', async () => {
    mockRepo.findMember.mockResolvedValue(
      member({ fitnessGoal: 'BUILD_MUSCLE', weightKg: 70, targetWeightKg: 75, age: 16 }),
    );
    await expect(useCase.execute('gym-1', 'member-1', GoalPace.FAST)).rejects.toMatchObject({
      code: 'PACE_UNAVAILABLE',
    });
    expect(mockRepo.createPlan).not.toHaveBeenCalled();
  });

  it('requires consent to use health data', async () => {
    mockRepo.findMember.mockResolvedValue(member({ healthDataConsentAt: null }));
    await expect(useCase.execute('gym-1', 'member-1')).rejects.toMatchObject({
      code: 'HEALTH_DATA_CONSENT_REQUIRED',
    });
    expect(mockRepo.createPlan).not.toHaveBeenCalled();
  });

  it('reports the missing profile fields', async () => {
    mockRepo.findMember.mockResolvedValue(member({ sex: null, heightCm: null }));
    await expect(useCase.execute('gym-1', 'member-1')).rejects.toMatchObject({
      code: 'PROFILE_INCOMPLETE',
      message: 'Profile is missing: sex, heightCm',
    });
  });

  it('rejects inputs the calculator cannot use', async () => {
    mockRepo.findMember.mockResolvedValue(member({ targetWeightKg: 85 }));
    await expect(useCase.execute('gym-1', 'member-1')).rejects.toMatchObject({
      code: 'TARGET_CONFLICTS_WITH_GOAL',
    });
  });

  it('returns not found for a member outside the gym', async () => {
    mockRepo.findMember.mockResolvedValue(null);
    await expect(useCase.execute('gym-2', 'member-1')).rejects.toMatchObject({ code: 'MEMBER_NOT_FOUND' });
  });
});

describe('GetFitnessPlanOptionsUseCase', () => {
  it('returns every pace without saving anything', async () => {
    jest.resetAllMocks();
    mockRepo.findMember.mockResolvedValue(member());
    const result = await new GetFitnessPlanOptionsUseCase(mockRepo).execute('gym-1', 'member-1');

    expect(result.options.map((o) => o.pace)).toEqual([GoalPace.STEADY, GoalPace.BALANCED, GoalPace.FAST]);
    expect(mockRepo.createPlan).not.toHaveBeenCalled();
  });
});
