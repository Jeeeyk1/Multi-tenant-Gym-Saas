import { Inject, Injectable } from '@nestjs/common';
import { AI_PROVIDER_PORT, type AiProviderPort } from '../../../../common/adapters/ai/ai-provider.port';
import { AiRepository } from '../../infrastructure/persistence/ai.repository';
import { NotFoundError } from '../../../../common/errors';

const MAX_TOKENS = 1024;
const FEATURE_KEY = 'meal_suggestion';

@Injectable()
export class MealSuggestionUseCase {
  constructor(
    @Inject(AI_PROVIDER_PORT) private readonly aiProvider: AiProviderPort,
    private readonly aiRepository: AiRepository,
  ) {}

  async execute(memberId: string, gymId: string): Promise<{ suggestion: string }> {
    const ctx = await this.aiRepository.findMemberContext(memberId, gymId);
    if (!ctx) throw new NotFoundError('Member not found', 'MEMBER_NOT_FOUND');

    const prompt = buildMealPrompt(ctx);
    const { text, tokensUsed } = await this.aiProvider.chat(prompt, MAX_TOKENS);

    await this.aiRepository.logUsage(
      ctx.organizationId,
      ctx.gymId,
      ctx.userId,
      FEATURE_KEY,
      tokensUsed,
    );

    return { suggestion: text };
  }
}

function buildMealPrompt(ctx: {
  fullName: string;
  age: number | null;
  weightKg: number | null;
  heightCm: number | null;
  fitnessGoal: string | null;
  activityLevel: string | null;
  recentCheckInsCount: number;
}): string {
  const name = ctx.fullName.split(' ')[0];
  const goal = ctx.fitnessGoal ?? 'IMPROVE_FITNESS';
  const level = ctx.activityLevel ?? 'MODERATE';

  const calorieHint =
    goal === 'LOSE_WEIGHT'
      ? 'calorie deficit (focus on lean protein and vegetables)'
      : goal === 'GAIN_MUSCLE'
        ? 'calorie surplus with high protein intake'
        : 'balanced macros for performance and recovery';

  return `You are a sports nutritionist. Give personalised meal guidance for ${name}.

Member profile:
- Age: ${ctx.age ?? 'unknown'}
- Weight: ${ctx.weightKg ? `${ctx.weightKg}kg` : 'unknown'}
- Height: ${ctx.heightCm ? `${ctx.heightCm}cm` : 'unknown'}
- Goal: ${goal.replace(/_/g, ' ')}
- Activity level: ${level.replace(/_/g, ' ')}
- Gym sessions in last 30 days: ${ctx.recentCheckInsCount}

Focus on ${calorieHint}. Provide:
1. Today's meal plan (breakfast, lunch, dinner, snacks) with estimated calories and macros
2. Key nutrition tips for their goal
3. A simple meal-prep idea for the week

Keep it practical, realistic, and encouraging. Use clear formatting.`;
}
