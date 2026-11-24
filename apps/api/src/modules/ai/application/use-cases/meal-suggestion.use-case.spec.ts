import { MealSuggestionUseCase, defaultMealTargets } from './meal-suggestion.use-case';
import type { AiProviderPort } from '../../../../common/adapters/ai/ai-provider.port';
import type { AiRepository, MemberContext } from '../../infrastructure/persistence/ai.repository';
import { AiFeature, MealPlanMode, MealStyle } from '../../../../common/enums';
import type { MemberAiLimitsService } from '../member-ai-limits.service';

const mockLimits = { run: jest.fn() } as unknown as jest.Mocked<MemberAiLimitsService>;
const mockProvider = { chat: jest.fn() } as unknown as jest.Mocked<AiProviderPort>;
const mockRepo = {
  findMemberContext: jest.fn(),
  saveMealPlan: jest.fn(),
  findActivePlanTargets: jest.fn(),
  sumFoodToday: jest.fn(),
} as unknown as jest.Mocked<AiRepository>;

const ctx: MemberContext = {
  memberId: 'member-1',
  userId: 'user-1',
  fullName: 'Maria Santos',
  gymId: 'gym-1',
  gymName: 'Iron Temple',
  organizationId: 'org-1',
  timezone: 'Asia/Manila',
  age: 28,
  weightKg: 60,
  targetWeightKg: 65,
  heightCm: 165,
  fitnessGoal: 'BUILD_MUSCLE',
  activityLevel: 'MODERATE',
  daysPerWeek: 4,
  experienceLevel: 'BEGINNER',
  preferredStyle: 'WEIGHTS',
  dietType: 'VEGETARIAN',
  injuries: null,
  recentCheckInsCount: 8,
};

function sentPrompt(): string {
  return mockProvider.chat.mock.calls[0][0] as string;
}

describe('MealSuggestionUseCase prompt', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockRepo.findMemberContext.mockResolvedValue(ctx);
    mockLimits.run.mockImplementation((_ctx, _feature, call) => call());
    mockRepo.findActivePlanTargets.mockResolvedValue({ kcal: 2400, proteinG: 96 });
    mockRepo.sumFoodToday.mockResolvedValue({ kcal: 0, proteinG: 0 });
    mockProvider.chat.mockResolvedValue({ text: '{"meals":[]}', tokensUsed: 100 } as never);
  });

  it('asks for a surplus when the goal is BUILD_MUSCLE', async () => {
    await new MealSuggestionUseCase(mockProvider, mockRepo, mockLimits).execute('member-1', 'gym-1', {
      mode: MealPlanMode.FULL_DAY,
    });
    expect(sentPrompt()).toContain('calorie surplus with high protein intake');
  });

  it('passes the diet as a rule every item must follow', async () => {
    await new MealSuggestionUseCase(mockProvider, mockRepo, mockLimits).execute('member-1', 'gym-1', {
      mode: MealPlanMode.FULL_DAY,
    });
    expect(sentPrompt()).toContain('Every item must follow the diet: Vegetarian');
  });

  it("aims a single meal at what is left of today's plan", async () => {
    mockRepo.sumFoodToday.mockResolvedValue({ kcal: 1800, proteinG: 70 });
    await new MealSuggestionUseCase(mockProvider, mockRepo, mockLimits).execute('member-1', 'gym-1', {
      mode: MealPlanMode.SINGLE_MEAL,
    });
    expect(sentPrompt()).toContain('Target calories: 600 kcal (for this one meal)');
    expect(sentPrompt()).toContain('Target protein: ~26 g');
  });

  it('accepts a single meal below 800 kcal', async () => {
    await new MealSuggestionUseCase(mockProvider, mockRepo, mockLimits).execute('member-1', 'gym-1', {
      mode: MealPlanMode.SINGLE_MEAL,
      targetCalories: 600,
    });
    expect(sentPrompt()).toContain('Target calories: 600 kcal (for this one meal)');
  });

  it('rejects a full day below 800 kcal before calling the AI', async () => {
    await expect(
      new MealSuggestionUseCase(mockProvider, mockRepo, mockLimits).execute('member-1', 'gym-1', {
        mode: MealPlanMode.FULL_DAY,
        targetCalories: 600,
      }),
    ).rejects.toMatchObject({ code: 'TARGET_CALORIES_TOO_LOW' });
    expect(mockProvider.chat).not.toHaveBeenCalled();
  });

  it('turns an empty AI reply into a retryable 502', async () => {
    mockProvider.chat.mockResolvedValue({ text: '', tokensUsed: 1500 } as never);
    await expect(
      new MealSuggestionUseCase(mockProvider, mockRepo, mockLimits).execute('member-1', 'gym-1', {
        mode: MealPlanMode.SINGLE_MEAL,
      }),
    ).rejects.toMatchObject({ statusCode: 502, code: 'AI_BAD_RESPONSE' });
    expect(mockRepo.saveMealPlan).not.toHaveBeenCalled();
  });

  it('passes the chosen style to the prompt', async () => {
    await new MealSuggestionUseCase(mockProvider, mockRepo, mockLimits).execute('member-1', 'gym-1', {
      mode: MealPlanMode.SINGLE_MEAL,
      style: MealStyle.BUDGET,
    });
    expect(sentPrompt()).toContain('Style: Budget-friendly');
  });

  it('runs the AI call through the monthly limit', async () => {
    mockLimits.run.mockRejectedValue(Object.assign(new Error('limit'), { code: 'MEMBER_AI_LIMIT_REACHED' }));
    await expect(
      new MealSuggestionUseCase(mockProvider, mockRepo, mockLimits).execute('member-1', 'gym-1', {
        mode: MealPlanMode.FULL_DAY,
      }),
    ).rejects.toMatchObject({ code: 'MEMBER_AI_LIMIT_REACHED' });
    expect(mockLimits.run).toHaveBeenCalledWith(ctx, AiFeature.MEAL_SUGGESTION, expect.any(Function));
    expect(mockProvider.chat).not.toHaveBeenCalled();
  });

  it('lets explicit request values override the plan', async () => {
    await new MealSuggestionUseCase(mockProvider, mockRepo, mockLimits).execute('member-1', 'gym-1', {
      mode: MealPlanMode.FULL_DAY,
      targetCalories: 2000,
    });
    expect(sentPrompt()).toContain('Target calories: 2000 kcal (for the whole day)');
  });

  it("does not send the member's name to the AI provider", async () => {
    await new MealSuggestionUseCase(mockProvider, mockRepo, mockLimits).execute('member-1', 'gym-1', {
      mode: MealPlanMode.FULL_DAY,
    });
    expect(sentPrompt()).not.toContain('Maria');
    expect(sentPrompt()).not.toContain('Santos');
  });
});

describe('defaultMealTargets', () => {
  const plan = { kcal: 2000, proteinG: 150 };
  const single = { mode: MealPlanMode.SINGLE_MEAL };

  it('uses the whole day for a full-day plan', () => {
    expect(defaultMealTargets({ mode: MealPlanMode.FULL_DAY }, plan, null)).toEqual({ kcal: 2000, proteinG: 150 });
  });

  it('caps a single meal at 40% of the day early on', () => {
    expect(defaultMealTargets(single, plan, { kcal: 0, proteinG: 0 })).toEqual({ kcal: 800, proteinG: 60 });
  });

  it('keeps a small meal once the day is nearly used up', () => {
    expect(defaultMealTargets(single, plan, { kcal: 1950, proteinG: 148 })).toEqual({ kcal: 200, proteinG: 15 });
  });

  it('lets the model estimate when there is no plan', () => {
    expect(defaultMealTargets(single, null, null)).toEqual({ kcal: undefined, proteinG: undefined });
  });
});
