import { Inject, Injectable } from '@nestjs/common';
import { AI_PROVIDER_PORT, type AiProviderPort } from '../../../../common/adapters/ai/ai-provider.port';
import { AiRepository } from '../../infrastructure/persistence/ai.repository';
import { NotFoundError } from '../../../../common/errors';

const MAX_TOKENS = 600;
const FEATURE_KEY = 'exercise_instructions';

@Injectable()
export class GetExerciseInstructionsUseCase {
  constructor(
    @Inject(AI_PROVIDER_PORT) private readonly aiProvider: AiProviderPort,
    private readonly aiRepository: AiRepository,
  ) {}

  async execute(
    exerciseName: string,
    memberId: string,
    gymId: string,
  ): Promise<{
    targetMuscles: string[];
    steps: string[];
    commonMistakes: string[];
    easier: string;
    harder: string;
  }> {
    const ctx = await this.aiRepository.findMemberContext(memberId, gymId);
    if (!ctx) throw new NotFoundError('Member not found', 'MEMBER_NOT_FOUND');

    const prompt = `Return ONLY a valid JSON object (no markdown, no extra text) with instructions for the exercise: "${exerciseName}".

Schema:
{
  "targetMuscles": ["<2-4 primary muscles>"],
  "steps": ["<4-6 clear execution steps>"],
  "commonMistakes": ["<2-3 mistakes to avoid>"],
  "easier": "<one easier regression or alternative>",
  "harder": "<one harder progression or alternative>"
}

Keep every step to one concise action. Avoid generic filler.`;

    const { text, tokensUsed } = await this.aiProvider.chat(prompt, MAX_TOKENS);

    await this.aiRepository.logUsage(
      ctx.organizationId,
      ctx.gymId,
      ctx.userId,
      FEATURE_KEY,
      tokensUsed,
    );

    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start === -1 || end === -1) throw new Error('AI did not return valid JSON');
    return JSON.parse(text.slice(start, end + 1));
  }
}
