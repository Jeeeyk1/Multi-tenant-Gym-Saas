import { Inject, Injectable } from '@nestjs/common';
import { AI_PROVIDER_PORT, type AiProviderPort } from '../../../../common/adapters/ai/ai-provider.port';
import { AiRepository } from '../../infrastructure/persistence/ai.repository';
import { NotFoundError } from '../../../../common/errors';

const MAX_TOKENS = 1024;
const FEATURE_KEY = 'workout_suggestion';

@Injectable()
export class WorkoutSuggestionUseCase {
  constructor(
    @Inject(AI_PROVIDER_PORT) private readonly aiProvider: AiProviderPort,
    private readonly aiRepository: AiRepository,
  ) {}

  async execute(memberId: string, gymId: string): Promise<{ suggestion: string }> {
    const ctx = await this.aiRepository.findMemberContext(memberId, gymId);
    if (!ctx) throw new NotFoundError('Member not found', 'MEMBER_NOT_FOUND');

    const today = new Date();
    const dayName = today.toLocaleDateString('en-US', { weekday: 'long' });
    const dateFmt = today.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });

    const prompt = buildWorkoutPrompt(ctx, dayName, dateFmt);
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

function buildWorkoutPrompt(
  ctx: {
    fullName: string;
    age: number | null;
    weightKg: number | null;
    fitnessGoal: string | null;
    activityLevel: string | null;
    recentCheckInsCount: number;
    gymName: string;
  },
  dayName: string,
  dateFmt: string,
): string {
  const name = ctx.fullName.split(' ')[0];
  const goal = ctx.fitnessGoal ?? 'IMPROVE_FITNESS';
  const level = ctx.activityLevel ?? 'MODERATE';

  return `You are a personal trainer at ${ctx.gymName}. Create a personalised workout plan for ${name}.

Member profile:
- Age: ${ctx.age ?? 'unknown'}
- Weight: ${ctx.weightKg ? `${ctx.weightKg}kg` : 'unknown'}
- Goal: ${goal.replace(/_/g, ' ')}
- Activity level: ${level.replace(/_/g, ' ')}
- Check-ins in the last 30 days: ${ctx.recentCheckInsCount}

Today is ${dayName}, ${dateFmt}.

Generate a workout plan for today's session aligned with their goal (${goal.replace(/_/g, ' ').toLowerCase()}).
Keep it to 45–60 minutes. Include warm-up, main exercises with sets/reps/rest, and cool-down.
Format clearly with sections. Be encouraging and specific.`;
}
