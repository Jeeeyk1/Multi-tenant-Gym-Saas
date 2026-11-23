import { Inject, Injectable } from '@nestjs/common';
import { AI_PROVIDER_PORT, type AiProviderPort } from '../../../../common/adapters/ai/ai-provider.port';
import { AiRepository, type MemberContext, type PlanTargets } from '../../infrastructure/persistence/ai.repository';
import { NotFoundError } from '../../../../common/errors';
import { DietType, FitnessGoal, MealPlanMode } from '../../../../common/enums';

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

    const planTargets = await this.aiRepository.findActivePlanTargets(memberId);
    const prompt = buildMealPrompt(ctx, params, planTargets);
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

const DIET_RULES: Record<DietType, string | null> = {
  [DietType.NONE]: null,
  [DietType.VEGETARIAN]: 'Vegetarian: no meat, poultry or fish. Eggs and dairy are fine.',
  [DietType.VEGAN]: 'Vegan: no animal products at all (no meat, fish, eggs, dairy or honey).',
  [DietType.HALAL]: 'Halal: no pork, no alcohol, and only halal meat.',
  [DietType.GLUTEN_FREE]: 'Gluten-free: no wheat, barley or rye (watch soy sauce and breading).',
};

// The member's name is deliberately not sent to the AI provider: it adds nothing to the plan.
function buildMealPrompt(ctx: MemberContext, params: MealPlanParams, plan: PlanTargets | null): string {
  const goal = ctx.fitnessGoal ?? FitnessGoal.GET_FIT;
  const level = ctx.activityLevel ?? 'MODERATE';
  const dietRule = DIET_RULES[ctx.dietType as DietType] ?? null;

  const calorieHint =
    goal === FitnessGoal.LOSE_WEIGHT
      ? 'calorie deficit (focus on lean protein and vegetables)'
      : goal === FitnessGoal.BUILD_MUSCLE
        ? 'calorie surplus with high protein intake'
        : 'balanced macros for performance and recovery';

  const isFullDay = params.mode === MealPlanMode.FULL_DAY;
  const mealCount = params.mealCount ?? 3;

  // Explicit request values win; otherwise use the member's saved plan (a single meal
  // gets an even share of the day); otherwise let the model estimate.
  const planShare = isFullDay ? 1 : 1 / mealCount;
  const targetCalories = params.targetCalories ?? (plan ? Math.round(plan.kcal * planShare) : undefined);
  const targetProteinG = params.targetProteinG ?? (plan ? Math.round(plan.proteinG * planShare) : undefined);

  const requestLines: string[] = [];
  if (targetCalories) {
    requestLines.push(`- Target calories: ${targetCalories} kcal (${isFullDay ? 'for the whole day' : 'for this one meal'})`);
  } else {
    requestLines.push(`- Target calories: estimate an appropriate amount from the profile and goal`);
  }
  if (targetProteinG != null) {
    requestLines.push(`- Target protein: ~${targetProteinG} g (${isFullDay ? 'for the whole day' : 'for this one meal'})`);
  }
  if (isFullDay) {
    requestLines.push(`- Split the day into exactly ${mealCount} meals`);
  }

  const task = isFullDay
    ? `Build a full-day meal plan split into exactly ${mealCount} meals.`
    : `Suggest a single meal (one sitting) for right now.`;

  const mealsSchemaNote = isFullDay
    ? `"meals" must contain exactly ${mealCount} entries covering the day.`
    : `"meals" must contain exactly 1 entry (the single meal).`;

  return `You are a sports nutritionist at a gym. ${task} Personalise it for this member.

Member profile:
- Age: ${ctx.age ?? 'unknown'}
- Weight: ${ctx.weightKg ? `${ctx.weightKg} kg` : 'unknown'}
- Height: ${ctx.heightCm ? `${ctx.heightCm} cm` : 'unknown'}
- Goal: ${goal.replace(/_/g, ' ')}
- Activity level: ${level.replace(/_/g, ' ')}
- Gym sessions in last 30 days: ${ctx.recentCheckInsCount}
- Diet: ${dietRule ?? 'no restrictions'}

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
- Use realistic Filipino-friendly foods and portions where sensible.${dietRule ? `\n- Every item must follow the diet: ${dietRule}` : ''}
- Keep each tip under 15 words. Provide 2-3 tips.
- All macro numbers are grams, calories are kcal, integers only.`;
}
