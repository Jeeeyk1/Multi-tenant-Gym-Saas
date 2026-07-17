import { Inject, Injectable } from '@nestjs/common';
import { AI_PROVIDER_PORT, type AiProviderPort } from '../../../../common/adapters/ai/ai-provider.port';
import { AiRepository } from '../../infrastructure/persistence/ai.repository';
import { NotFoundError } from '../../../../common/errors';
import { MealPlanMode } from '../../../../common/enums';

const MAX_TOKENS = 1500;
const FEATURE_KEY = 'meal_suggestion';

export interface MealPlanParams {
  mode: MealPlanMode;
  targetCalories?: number;
  mealCount?: number;
  targetProteinG?: number;
}

@Injectable()
export class MealSuggestionUseCase {
  constructor(
    @Inject(AI_PROVIDER_PORT) private readonly aiProvider: AiProviderPort,
    private readonly aiRepository: AiRepository,
  ) {}

  async execute(memberId: string, gymId: string, params: MealPlanParams): Promise<{ suggestion: string }> {
    const ctx = await this.aiRepository.findMemberContext(memberId, gymId);
    if (!ctx) throw new NotFoundError('Member not found', 'MEMBER_NOT_FOUND');

    const prompt = buildMealPrompt(ctx, params);
    const { text, tokensUsed } = await this.aiProvider.chat(prompt, MAX_TOKENS);

    const suggestion = extractJson(text);

    await Promise.all([
      this.aiRepository.logUsage(ctx.organizationId, ctx.gymId, ctx.userId, FEATURE_KEY, tokensUsed),
      // Persist so the plan survives app navigation/reopen instead of living only
      // in mobile component state (mirrors saveWorkoutPlan).
      this.aiRepository.saveMealPlan(memberId, gymId, suggestion),
    ]);

    return { suggestion };
  }
}

function extractJson(raw: string): string {
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start === -1 || end === -1) throw new Error('AI did not return valid JSON');
  const json = raw.slice(start, end + 1);
  JSON.parse(json);
  return json;
}

function buildMealPrompt(
  ctx: {
    fullName: string;
    age: number | null;
    weightKg: number | null;
    heightCm: number | null;
    fitnessGoal: string | null;
    activityLevel: string | null;
    recentCheckInsCount: number;
  },
  params: MealPlanParams,
): string {
  const name = ctx.fullName.split(' ')[0];
  const goal = ctx.fitnessGoal ?? 'IMPROVE_FITNESS';
  const level = ctx.activityLevel ?? 'MODERATE';

  const calorieHint =
    goal === 'LOSE_WEIGHT'
      ? 'calorie deficit (focus on lean protein and vegetables)'
      : goal === 'GAIN_MUSCLE'
        ? 'calorie surplus with high protein intake'
        : 'balanced macros for performance and recovery';

  const isFullDay = params.mode === MealPlanMode.FULL_DAY;
  const mealCount = params.mealCount ?? 3;

  const requestLines: string[] = [];
  if (params.targetCalories) {
    requestLines.push(`- Target calories: ${params.targetCalories} kcal (${isFullDay ? 'for the whole day' : 'for this one meal'})`);
  } else {
    requestLines.push(`- Target calories: estimate an appropriate amount from the profile and goal`);
  }
  if (isFullDay) {
    requestLines.push(`- Split the day into exactly ${mealCount} meals`);
  } else if (params.targetProteinG != null) {
    requestLines.push(`- Target protein for this meal: ~${params.targetProteinG} g`);
  }

  const task = isFullDay
    ? `Build a full-day meal plan split into exactly ${mealCount} meals.`
    : `Suggest a single meal (one sitting) for right now.`;

  const mealsSchemaNote = isFullDay
    ? `"meals" must contain exactly ${mealCount} entries covering the day.`
    : `"meals" must contain exactly 1 entry (the single meal).`;

  return `You are a sports nutritionist at a gym. ${task} Personalise it for ${name}.

Member profile:
- Age: ${ctx.age ?? 'unknown'}
- Weight: ${ctx.weightKg ? `${ctx.weightKg} kg` : 'unknown'}
- Height: ${ctx.heightCm ? `${ctx.heightCm} cm` : 'unknown'}
- Goal: ${goal.replace(/_/g, ' ')}
- Activity level: ${level.replace(/_/g, ' ')}
- Gym sessions in last 30 days: ${ctx.recentCheckInsCount}

Request:
${requestLines.join('\n')}
- Emphasis: ${calorieHint}

Return ONLY a valid JSON object — no markdown, no extra text, just the JSON.

Schema:
{
  "mode": "${params.mode}",
  "title": "<short title, e.g. 'Full Day Plan' or 'High-Protein Lunch'>",
  "targetCalories": <number>,
  "totalCalories": <sum of meal calories>,
  "totalProteinG": <sum of meal protein>,
  "meals": [
    {
      "name": "<meal name, e.g. Breakfast>",
      "calories": <number>,
      "proteinG": <number>,
      "carbsG": <number>,
      "fatG": <number>,
      "items": ["<food item with portion>", "<food item with portion>"]
    }
  ],
  "tips": ["<short practical tip>", "<short practical tip>"]
}

Rules:
- ${mealsSchemaNote}
- Use realistic Filipino-friendly foods and portions where sensible.
- Keep each tip under 15 words. Provide 2-3 tips.
- All macro numbers are grams, calories are kcal, integers only.`;
}
