import { Inject, Injectable } from '@nestjs/common';
import { AI_PROVIDER_PORT, type AiProviderPort } from '../../../../common/adapters/ai/ai-provider.port';
import { AiRepository } from '../../infrastructure/persistence/ai.repository';
import { NotFoundError } from '../../../../common/errors';

const MAX_TOKENS = 512;
const FEATURE_KEY = 'analyse_meal';

export interface MealAnalysis {
  description: string;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  notes: string;
}

@Injectable()
export class AnalyseMealUseCase {
  constructor(
    @Inject(AI_PROVIDER_PORT) private readonly aiProvider: AiProviderPort,
    private readonly aiRepository: AiRepository,
  ) {}

  async execute(memberId: string, gymId: string, description: string): Promise<MealAnalysis> {
    const ctx = await this.aiRepository.findMemberContext(memberId, gymId);
    if (!ctx) throw new NotFoundError('Member not found', 'MEMBER_NOT_FOUND');

    const prompt = `Analyse this meal and estimate its nutritional content.

Meal: "${description}"

Return ONLY valid JSON (no markdown, no explanation) in this exact shape:
{
  "description": "<brief cleaned-up description of the meal>",
  "calories": <integer>,
  "proteinG": <number with 1 decimal>,
  "carbsG": <number with 1 decimal>,
  "fatG": <number with 1 decimal>,
  "notes": "<one short tip or observation about this meal>"
}`;

    const { text, tokensUsed } = await this.aiProvider.chat(prompt, MAX_TOKENS);

    let analysis: MealAnalysis;
    try {
      analysis = JSON.parse(text) as MealAnalysis;
    } catch {
      const json = text.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
      analysis = JSON.parse(json) as MealAnalysis;
    }

    await this.aiRepository.logUsage(
      ctx.organizationId,
      ctx.gymId,
      ctx.userId,
      FEATURE_KEY,
      tokensUsed,
    );

    return analysis;
  }
}
