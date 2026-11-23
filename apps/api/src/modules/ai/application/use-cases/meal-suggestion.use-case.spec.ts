import { MealSuggestionUseCase } from './meal-suggestion.use-case';
import type { AiProviderPort } from '../../../../common/adapters/ai/ai-provider.port';
import type { AiRepository, MemberContext } from '../../infrastructure/persistence/ai.repository';
import { MealPlanMode } from '../../../../common/enums';

const mockProvider = { chat: jest.fn() } as unknown as jest.Mocked<AiProviderPort>;
const mockRepo = {
  findMemberContext: jest.fn(),
  logUsage: jest.fn(),
  saveMealPlan: jest.fn(),
  findActivePlanTargets: jest.fn(),
} as unknown as jest.Mocked<AiRepository>;

const ctx: MemberContext = {
  memberId: 'member-1',
  userId: 'user-1',
  fullName: 'Maria Santos',
  gymId: 'gym-1',
  gymName: 'Iron Temple',
  organizationId: 'org-1',
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
    mockRepo.findActivePlanTargets.mockResolvedValue({ kcal: 2400, proteinG: 96 });
    mockProvider.chat.mockResolvedValue({ text: '{"meals":[]}', tokensUsed: 100 } as never);
  });

  it('asks for a surplus when the goal is BUILD_MUSCLE', async () => {
    await new MealSuggestionUseCase(mockProvider, mockRepo).execute('member-1', 'gym-1', {
      mode: MealPlanMode.FULL_DAY,
    });
    expect(sentPrompt()).toContain('calorie surplus with high protein intake');
  });

  it('passes the diet as a rule every item must follow', async () => {
    await new MealSuggestionUseCase(mockProvider, mockRepo).execute('member-1', 'gym-1', {
      mode: MealPlanMode.FULL_DAY,
    });
    expect(sentPrompt()).toContain('Every item must follow the diet: Vegetarian');
  });

  it("uses the saved plan's targets when the request gives none", async () => {
    await new MealSuggestionUseCase(mockProvider, mockRepo).execute('member-1', 'gym-1', {
      mode: MealPlanMode.SINGLE_MEAL,
    });
    // One of three meals → a third of the day.
    expect(sentPrompt()).toContain('Target calories: 800 kcal (for this one meal)');
    expect(sentPrompt()).toContain('Target protein: ~32 g');
  });

  it('lets explicit request values override the plan', async () => {
    await new MealSuggestionUseCase(mockProvider, mockRepo).execute('member-1', 'gym-1', {
      mode: MealPlanMode.FULL_DAY,
      targetCalories: 2000,
    });
    expect(sentPrompt()).toContain('Target calories: 2000 kcal (for the whole day)');
  });

  it("does not send the member's name to the AI provider", async () => {
    await new MealSuggestionUseCase(mockProvider, mockRepo).execute('member-1', 'gym-1', {
      mode: MealPlanMode.FULL_DAY,
    });
    expect(sentPrompt()).not.toContain('Maria');
    expect(sentPrompt()).not.toContain('Santos');
  });
});
