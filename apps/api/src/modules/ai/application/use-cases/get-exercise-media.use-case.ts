import { Injectable } from '@nestjs/common';
import { AiRepository } from '../../infrastructure/persistence/ai.repository';

@Injectable()
export class GetExerciseMediaUseCase {
  constructor(private readonly aiRepository: AiRepository) {}

  async execute(exerciseName: string): Promise<{ gifUrl: string | null }> {
    const normalized = exerciseName.toLowerCase().trim();
    const cached = await this.aiRepository.getExerciseMedia(normalized);
    return { gifUrl: cached?.gifUrl ?? null };
  }
}
