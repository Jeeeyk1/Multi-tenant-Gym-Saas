import { Inject, Injectable } from '@nestjs/common';
import { AI_PROVIDER_PORT, type AiProviderPort } from '../../../../common/adapters/ai/ai-provider.port';
import { AiRepository, type MemberContext } from '../../infrastructure/persistence/ai.repository';
import { NotFoundError } from '../../../../common/errors';

const MAX_TOKENS = 4000;
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

    const exerciseGroups = await this.aiRepository.listExercisesGrouped();
    const prompt = buildWeeklyPlanPrompt(ctx, exerciseGroups);
    const { text, tokensUsed } = await this.aiProvider.chat(prompt, MAX_TOKENS);

    const suggestion = extractJson(text);

    await Promise.all([
      this.aiRepository.logUsage(ctx.organizationId, ctx.gymId, ctx.userId, FEATURE_KEY, tokensUsed),
      this.aiRepository.saveWorkoutPlan(memberId, gymId, suggestion),
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

function buildWeeklyPlanPrompt(ctx: MemberContext, exerciseGroups: Record<string, string[]>): string {
  const name = ctx.fullName.split(' ')[0];
  const goal = ctx.fitnessGoal ?? 'IMPROVE_FITNESS';
  const level = ctx.activityLevel ?? 'MODERATE';
  const experience = ctx.experienceLevel ?? 'BEGINNER';
  const style = ctx.preferredStyle ?? null;
  const daysPerWeek = ctx.daysPerWeek ?? 3;
  const injuries = ctx.injuries ?? null;

  const profileLines = [
    `- Age: ${ctx.age ?? 'unknown'}`,
    `- Weight: ${ctx.weightKg ? `${ctx.weightKg} kg` : 'unknown'}`,
    ctx.targetWeightKg ? `- Target weight: ${ctx.targetWeightKg} kg` : null,
    ctx.heightCm ? `- Height: ${ctx.heightCm} cm` : null,
    `- Fitness goal: ${goal.replace(/_/g, ' ')}`,
    `- Activity level: ${level.replace(/_/g, ' ')}`,
    `- Experience level: ${experience.replace(/_/g, ' ')}`,
    style ? `- Preferred style: ${style.replace(/_/g, ' ')}` : null,
    `- Training days per week: ${daysPerWeek}`,
    injuries ? `- Injuries / limitations: ${injuries}` : null,
    `- Gym check-ins last 30 days: ${ctx.recentCheckInsCount}`,
  ]
    .filter(Boolean)
    .join('\n');

  const hasExercises = Object.keys(exerciseGroups).length > 0;
  const exerciseListSection = hasExercises
    ? `\nAvailable exercises — use ONLY these exact names (match case exactly as shown):\n${
        Object.entries(exerciseGroups)
          .map(([muscle, names]) => `${muscle}: ${names.join(', ')}`)
          .join('\n')
      }\n`
    : '';

  return `You are a certified personal trainer at ${ctx.gymName}. Create a personalised ${daysPerWeek}-day weekly workout plan for ${name}.

Member profile:
${profileLines}
${exerciseListSection}
Return ONLY a valid JSON object — no markdown, no extra text, just the JSON.

Schema:
{
  "weekPlan": [
    {
      "day": "<day name e.g. Monday>",
      "focus": "<muscle group focus>",
      "totalDurationMin": <45-60>,
      "sections": [
        {
          "title": "Warm-Up",
          "exercises": [
            { "name": "<name>", "sets": <number or null>, "reps": "<e.g. 12 or 30 sec>", "restSec": <seconds or null>, "tip": "<one short form cue>" }
          ]
        },
        { "title": "Main Workout", "exercises": [ ... ] },
        { "title": "Cool-Down", "exercises": [ ... ] }
      ]
    }
  ]
}

Rules:
- Include exactly ${daysPerWeek} training days spread across the week (e.g. Mon/Wed/Fri for 3 days)
- Distribute muscle groups so no two consecutive days train the same muscles
- Warm-Up: 2-3 exercises (5-8 min)
- Main Workout: 4-6 exercises per day
- Cool-Down: 2-3 stretches (5 min)
- Adapt to ${experience.replace(/_/g, ' ')} experience level${injuries ? `; avoid strain on: ${injuries}` : ''}
- Keep tips concise (max 8 words each)${style ? `\n- Incorporate ${style.replace(/_/g, ' ')} style` : ''}${hasExercises ? '\n- Exercise names must match the list above exactly — do not invent new names' : ''}`;
}
