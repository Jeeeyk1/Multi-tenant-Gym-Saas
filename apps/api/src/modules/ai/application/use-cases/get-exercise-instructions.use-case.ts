import { Inject, Injectable } from '@nestjs/common';
import { AI_PROVIDER_PORT, type AiProviderPort } from '../../../../common/adapters/ai/ai-provider.port';
import { MemberAiLimitsService } from '../member-ai-limits.service';
import { parseAiJson } from '../parse-ai-json';
import { AiRepository } from '../../infrastructure/persistence/ai.repository';
import { AiFeature } from '../../../../common/enums';
import { NotFoundError } from '../../../../common/errors';

const MAX_TOKENS = 600;

@Injectable()
export class GetExerciseInstructionsUseCase {
  constructor(
    @Inject(AI_PROVIDER_PORT) private readonly aiProvider: AiProviderPort,
    private readonly aiRepository: AiRepository,
    private readonly limits: MemberAiLimitsService,
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

    const { text } = await this.limits.run(ctx, AiFeature.EXERCISE_INSTRUCTIONS, () =>
      this.aiProvider.chat(prompt, MAX_TOKENS),
    );

    return parseAiJson(text);
  }
}
