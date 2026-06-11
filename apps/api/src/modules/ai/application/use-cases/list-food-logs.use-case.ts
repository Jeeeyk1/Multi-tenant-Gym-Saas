import { Injectable } from '@nestjs/common';
import { AiRepository } from '../../infrastructure/persistence/ai.repository';
import { NotFoundError } from '../../../../common/errors';

@Injectable()
export class ListFoodLogsUseCase {
  constructor(private readonly aiRepository: AiRepository) {}

  async execute(memberId: string, gymId: string, limit = 20) {
    const ctx = await this.aiRepository.findMemberContext(memberId, gymId);
    if (!ctx) throw new NotFoundError('Member not found', 'MEMBER_NOT_FOUND');

    return this.aiRepository.listFoodLogs(memberId, limit);
  }
}
