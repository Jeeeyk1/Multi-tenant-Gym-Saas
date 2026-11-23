import { Inject, Injectable } from '@nestjs/common';
import { AI_PROVIDER_PORT, type AiProviderPort } from '../../../../common/adapters/ai/ai-provider.port';
import { MemberAiLimitsService } from '../member-ai-limits.service';
import { parseAiJson } from '../parse-ai-json';
import { AiRepository, type MemberContext } from '../../infrastructure/persistence/ai.repository';
import { NotFoundError } from '../../../../common/errors';
import { AiFeature, WorkoutEmphasis, WorkoutFocus } from '../../../../common/enums';

const MAX_TOKENS = 4000;

export interface WorkoutPlanRequest {
  focus?: WorkoutFocus;
  emphasis?: WorkoutEmphasis;
  daysPerWeek?: number;
  sessionMinutes?: number;
}

@Injectable()
export class WorkoutSuggestionUseCase {
  constructor(
    @Inject(AI_PROVIDER_PORT) private readonly aiProvider: AiProviderPort,
    private readonly aiRepository: AiRepository,
    private readonly limits: MemberAiLimitsService,
  ) {}

  async execute(memberId: string, gymId: string, request: WorkoutPlanRequest = {}): Promise<{ suggestion: string }> {
    const ctx = await this.aiRepository.findMemberContext(memberId, gymId);
    if (!ctx) throw new NotFoundError('Member not found', 'MEMBER_NOT_FOUND');

    const exerciseGroups = await this.aiRepository.listExercisesGrouped();
    const prompt = buildWeeklyPlanPrompt(ctx, exerciseGroups, request);
    const { text } = await this.limits.run(ctx, AiFeature.WORKOUT_PLAN, () =>
      this.aiProvider.chat(prompt, MAX_TOKENS),
    );

    // Persist the goal/focus alongside the plan so a later single-exercise swap can honour the
    // "same target and goal" the plan was built with, even after the app reloads.
    const plan = parseAiJson(text);
    plan.meta = {
      emphasis: request.emphasis ?? emphasisFromGoal(ctx.fitnessGoal),
      focus: request.focus ?? WorkoutFocus.AUTO,
    };
    const suggestion = JSON.stringify(plan);

    await this.aiRepository.saveWorkoutPlan(memberId, gymId, suggestion);

    return { suggestion };
  }
}

/** Maps a member's onboarding fitness goal to a per-plan training emphasis. */
export function emphasisFromGoal(goal: string | null): WorkoutEmphasis {
  switch (goal) {
    case 'LOSE_WEIGHT':
      return WorkoutEmphasis.BURN_FAT;
    case 'BUILD_MUSCLE':
      return WorkoutEmphasis.BUILD_MUSCLE;
    default:
      return WorkoutEmphasis.BALANCED;
  }
}

const FOCUS_INSTRUCTION: Record<WorkoutFocus, string | null> = {
  [WorkoutFocus.AUTO]: null,
  [WorkoutFocus.FULL_BODY]: 'Make every training day a full-body session hitting all major muscle groups.',
  [WorkoutFocus.UPPER_BODY]: 'Prioritise upper body (chest, back, shoulders, arms); include only light lower-body or core accessory work.',
  [WorkoutFocus.LOWER_BODY]: 'Prioritise lower body (quads, hamstrings, glutes, calves); include only light upper-body or core accessory work.',
  [WorkoutFocus.CORE]: 'Centre the plan on core and abdominal strength, with supporting compound movements.',
};

export const EMPHASIS_INSTRUCTION: Record<WorkoutEmphasis, string | null> = {
  [WorkoutEmphasis.BALANCED]: null,
  [WorkoutEmphasis.BUILD_MUSCLE]: 'Emphasise hypertrophy: moderate-heavy loads, 8-12 reps, 3-4 sets, controlled tempo.',
  [WorkoutEmphasis.BURN_FAT]: 'Emphasise fat loss: higher reps (12-20), shorter rest (30-45s), circuit-style pacing and conditioning.',
  [WorkoutEmphasis.STRENGTH]: 'Emphasise strength: compound lifts, lower reps (3-6), heavier loads, longer rest (90-180s).',
  [WorkoutEmphasis.ENDURANCE]: 'Emphasise muscular endurance and cardio: high reps (15-25), minimal rest, sustained effort.',
};

function buildWeeklyPlanPrompt(
  ctx: MemberContext,
  exerciseGroups: Record<string, string[]>,
  request: WorkoutPlanRequest,
): string {
  const name = ctx.fullName.split(' ')[0];
  const goal = ctx.fitnessGoal ?? 'IMPROVE_FITNESS';
  const level = ctx.activityLevel ?? 'MODERATE';
  const experience = ctx.experienceLevel ?? 'BEGINNER';
  const style = ctx.preferredStyle ?? null;
  // Requested overrides win; otherwise fall back to the member's profile.
  const daysPerWeek = request.daysPerWeek ?? ctx.daysPerWeek ?? 3;
  const sessionMinutes = request.sessionMinutes ?? null;
  const focus = request.focus ?? WorkoutFocus.AUTO;
  const emphasis = request.emphasis ?? WorkoutEmphasis.BALANCED;
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

  const focusInstruction = FOCUS_INSTRUCTION[focus];
  const emphasisInstruction = EMPHASIS_INSTRUCTION[emphasis];
  const requestLines = [
    focusInstruction ? `- Focus: ${focusInstruction}` : null,
    emphasisInstruction ? `- Training emphasis: ${emphasisInstruction}` : null,
    sessionMinutes ? `- Target session length: about ${sessionMinutes} minutes per day (set totalDurationMin near this).` : null,
  ].filter(Boolean);
  const requestSection = requestLines.length
    ? `\nMember's request for this plan (honour these):\n${requestLines.join('\n')}\n`
    : '';

  const durationTarget = sessionMinutes
    ? `<about ${sessionMinutes}>`
    : '<45-60>';

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
${requestSection}${exerciseListSection}
Return ONLY a valid JSON object — no markdown, no extra text, just the JSON.

Schema:
{
  "weekPlan": [
    {
      "day": "<day name e.g. Monday>",
      "focus": "<muscle group focus>",
      "totalDurationMin": ${durationTarget},
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
- Distribute muscle groups so no two consecutive days train the same muscles${focus === WorkoutFocus.AUTO ? '' : ' (within the requested focus)'}
- Warm-Up: 2-3 exercises (5-8 min)
- Main Workout: 4-6 exercises per day
- Cool-Down: 2-3 stretches (5 min)
- Adapt to ${experience.replace(/_/g, ' ')} experience level${injuries ? `; avoid strain on: ${injuries}` : ''}
- Keep tips concise (max 8 words each)${style ? `\n- Incorporate ${style.replace(/_/g, ' ')} style` : ''}${hasExercises ? '\n- Exercise names must match the list above exactly — do not invent new names' : ''}`;
}
