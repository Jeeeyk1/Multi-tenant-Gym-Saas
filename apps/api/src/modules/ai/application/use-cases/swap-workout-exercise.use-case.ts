import { Inject, Injectable } from '@nestjs/common';
import { AI_PROVIDER_PORT, type AiProviderPort } from '../../../../common/adapters/ai/ai-provider.port';
import { MemberAiLimitsService } from '../member-ai-limits.service';
import { AiRepository, type MemberContext } from '../../infrastructure/persistence/ai.repository';
import { NotFoundError, ValidationError } from '../../../../common/errors';
import { AiFeature, WorkoutEmphasis } from '../../../../common/enums';
import { EMPHASIS_INSTRUCTION, emphasisFromGoal } from './workout-suggestion.use-case';

const MAX_TOKENS = 700;

export interface SwapWorkoutExerciseInput {
  day: string;
  sectionTitle: string;
  exerciseName: string;
  reason?: string;
}

export interface PlanExercise {
  name: string;
  sets: number | null;
  reps: string | null;
  restSec: number | null;
  tip: string | null;
}

interface PlanSection {
  title: string;
  exercises: PlanExercise[];
}

interface PlanDay {
  day: string;
  focus: string;
  totalDurationMin: number;
  sections: PlanSection[];
}

interface StoredPlan {
  weekPlan: PlanDay[];
  meta?: { emphasis?: WorkoutEmphasis; focus?: string };
}

@Injectable()
export class SwapWorkoutExerciseUseCase {
  constructor(
    @Inject(AI_PROVIDER_PORT) private readonly aiProvider: AiProviderPort,
    private readonly aiRepository: AiRepository,
    private readonly limits: MemberAiLimitsService,
  ) {}

  async execute(
    memberId: string,
    gymId: string,
    input: SwapWorkoutExerciseInput,
  ): Promise<{ exercise: PlanExercise }> {
    const stored = await this.aiRepository.getLatestWorkoutPlan(memberId);
    if (!stored) throw new NotFoundError('No workout plan to update', 'WORKOUT_PLAN_NOT_FOUND');

    let plan: StoredPlan;
    try {
      plan = JSON.parse(stored.suggestion) as StoredPlan;
    } catch {
      throw new ValidationError('Stored workout plan is not readable', 'WORKOUT_PLAN_CORRUPT');
    }

    const day = plan.weekPlan?.find((d) => d.day === input.day);
    if (!day) throw new NotFoundError('Day not found in plan', 'WORKOUT_DAY_NOT_FOUND');
    const section = day.sections.find((s) => s.title === input.sectionTitle);
    if (!section) throw new NotFoundError('Section not found in plan', 'WORKOUT_SECTION_NOT_FOUND');
    const index = section.exercises.findIndex((e) => e.name === input.exerciseName);
    if (index === -1) throw new NotFoundError('Exercise not found in plan', 'WORKOUT_EXERCISE_NOT_FOUND');

    const ctx = await this.aiRepository.findMemberContext(memberId, gymId);
    if (!ctx) throw new NotFoundError('Member not found', 'MEMBER_NOT_FOUND');

    const exerciseGroups = await this.aiRepository.listExercisesGrouped();
    const emphasis = plan.meta?.emphasis ?? emphasisFromGoal(ctx.fitnessGoal);

    // Avoid every exercise already in the plan so the swap is genuinely different.
    const avoid = new Set<string>();
    for (const d of plan.weekPlan) {
      for (const s of d.sections) {
        for (const e of s.exercises) avoid.add(e.name);
      }
    }

    const prompt = buildSwapPrompt({ ctx, day, section, emphasis, exerciseGroups, avoid, reason: input.reason });
    const { text } = await this.limits.run(ctx, AiFeature.EXERCISE_SWAP, () =>
      this.aiProvider.chat(prompt, MAX_TOKENS),
    );
    const replacement = parseExercise(text);

    section.exercises[index] = replacement;

    await this.aiRepository.saveWorkoutPlan(memberId, gymId, JSON.stringify(plan));

    return { exercise: replacement };
  }
}

function parseExercise(raw: string): PlanExercise {
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start === -1 || end === -1) throw new Error('AI did not return a valid exercise');
  const obj = JSON.parse(raw.slice(start, end + 1)) as Record<string, unknown>;
  if (typeof obj.name !== 'string' || !obj.name.trim()) {
    throw new Error('AI did not return a valid exercise name');
  }
  return {
    name: obj.name.trim(),
    sets: typeof obj.sets === 'number' ? obj.sets : null,
    reps: obj.reps == null ? null : String(obj.reps),
    restSec: typeof obj.restSec === 'number' ? obj.restSec : null,
    tip: typeof obj.tip === 'string' ? obj.tip : null,
  };
}

function buildSwapPrompt(args: {
  ctx: MemberContext;
  day: PlanDay;
  section: PlanSection;
  emphasis: WorkoutEmphasis;
  exerciseGroups: Record<string, string[]>;
  avoid: Set<string>;
  reason?: string;
}): string {
  const { ctx, day, section, emphasis, exerciseGroups, avoid, reason } = args;
  const experience = (ctx.experienceLevel ?? 'BEGINNER').replace(/_/g, ' ');
  const injuries = ctx.injuries ?? null;
  const emphasisLine = EMPHASIS_INSTRUCTION[emphasis];
  const cleanReason = reason?.trim();

  const hasExercises = Object.keys(exerciseGroups).length > 0;
  const listSection = hasExercises
    ? `\nAvailable exercises — choose ONLY from these exact names (match case exactly):\n${
        Object.entries(exerciseGroups)
          .map(([muscle, names]) => `${muscle}: ${names.join(', ')}`)
          .join('\n')
      }\n`
    : '';

  const avoidList = [...avoid].join(', ');

  const reasonLine = cleanReason
    ? `\nThe member's reason for swapping: "${cleanReason}". Honour it fully — if it implies missing equipment (e.g. no barbell, no cable machine), avoid EVERY exercise that needs that equipment, not just this one.\n`
    : '';

  return `You are a certified personal trainer at ${ctx.gymName}. A member wants to swap out ONE exercise from their workout plan${cleanReason ? '' : ' — likely because the equipment isn\'t available at their gym'}. Suggest a single replacement exercise.
${reasonLine}
The replacement must:
- Belong to the "${section.title}" portion of a "${day.focus}"-focused day, targeting the same muscle group.
- Fit a ${emphasis.replace(/_/g, ' ').toLowerCase()} goal${emphasisLine ? ` (${emphasisLine})` : ''}.
- Suit a ${experience} experience level${injuries ? `; avoid strain on: ${injuries}` : ''}.
- NOT be any of these already in the plan: ${avoidList}.
${listSection}
Return ONLY a valid JSON object — no markdown, no extra text:
{ "name": "<exact name from the list>", "sets": <number or null>, "reps": "<e.g. 12 or 30 sec>", "restSec": <seconds or null>, "tip": "<one short form cue, max 8 words>" }${hasExercises ? '\n\nThe name MUST match the available list exactly.' : ''}`;
}
