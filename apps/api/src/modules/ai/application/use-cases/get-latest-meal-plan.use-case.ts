import { Injectable } from '@nestjs/common';
import { AiRepository } from '../../infrastructure/persistence/ai.repository';

@Injectable()
export class GetLatestMealPlanUseCase {
  constructor(private readonly aiRepository: AiRepository) {}

  async execute(memberId: string): Promise<{ suggestion: string; generatedAt: Date } | null> {
    return this.aiRepository.getLatestMealPlan(memberId);
  }
}
