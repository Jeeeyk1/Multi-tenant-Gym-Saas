import { Injectable } from '@nestjs/common';
import { AiRepository } from '../../infrastructure/persistence/ai.repository';
import { NotFoundError } from '../../../../common/errors';
import type { LogFoodDto } from '../../presentation/dto/log-food.dto';

@Injectable()
export class LogFoodUseCase {
  constructor(private readonly aiRepository: AiRepository) {}

  async execute(memberId: string, gymId: string, dto: LogFoodDto) {
    const ctx = await this.aiRepository.findMemberContext(memberId, gymId);
    if (!ctx) throw new NotFoundError('Member not found', 'MEMBER_NOT_FOUND');

    return this.aiRepository.createFoodLog(memberId, {
      description: dto.description,
      calories: dto.calories,
      proteinG: dto.proteinG,
      carbsG: dto.carbsG,
      fatG: dto.fatG,
    });
  }
}
