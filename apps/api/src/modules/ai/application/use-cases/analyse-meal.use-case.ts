import { Inject, Injectable } from '@nestjs/common';
import { AI_PROVIDER_PORT, type AiProviderPort } from '../../../../common/adapters/ai/ai-provider.port';
import { VISION_PROVIDER_PORT, type VisionProviderPort } from '../../../../common/adapters/ai/vision-provider.port';
import { AiRepository } from '../../infrastructure/persistence/ai.repository';
import { NotFoundError } from '../../../../common/errors';

const TEXT_MAX_TOKENS = 512;
const VISION_MAX_TOKENS = 768;
const FEATURE_KEY = 'analyse_meal';

export interface MealAnalysis {
  description: string;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  notes: string;
}

const JSON_SHAPE = `{
  "description": "<brief description of the meal>",
  "calories": <integer>,
  "proteinG": <number with 1 decimal>,
  "carbsG": <number with 1 decimal>,
  "fatG": <number with 1 decimal>,
  "notes": "<one short observation or tip about this meal>"
}`;

@Injectable()
export class AnalyseMealUseCase {
  constructor(
    @Inject(AI_PROVIDER_PORT) private readonly aiProvider: AiProviderPort,
    @Inject(VISION_PROVIDER_PORT) private readonly visionProvider: VisionProviderPort,
    private readonly aiRepository: AiRepository,
  ) {}

  async execute(
    memberId: string,
    gymId: string,
    options: { description?: string; photoUrl?: string },
  ): Promise<MealAnalysis> {
    const ctx = await this.aiRepository.findMemberContext(memberId, gymId);
    if (!ctx) throw new NotFoundError('Member not found', 'MEMBER_NOT_FOUND');

    let rawText: string;
    let tokensUsed: number;

    if (options.photoUrl) {
      const prompt = `You are a nutrition expert. Analyse this food photo and estimate its nutritional content.${
        options.description ? `\n\nAdditional context from the user: "${options.description}"` : ''
      }

Return ONLY valid JSON (no markdown, no explanation) in this exact shape:
${JSON_SHAPE}`;

      const res = await this.visionProvider.analyseImage(options.photoUrl, prompt, VISION_MAX_TOKENS);
      rawText = res.text;
      tokensUsed = res.tokensUsed;
    } else {
      const prompt = `Analyse this meal and estimate its nutritional content.

Meal: "${options.description ?? ''}"

Return ONLY valid JSON (no markdown, no explanation) in this exact shape:
${JSON_SHAPE}`;

      const res = await this.aiProvider.chat(prompt, TEXT_MAX_TOKENS);
      rawText = res.text;
      tokensUsed = res.tokensUsed;
    }

    let analysis: MealAnalysis;
    try {
      analysis = JSON.parse(rawText) as MealAnalysis;
    } catch {
      const cleaned = rawText.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
      analysis = JSON.parse(cleaned) as MealAnalysis;
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
