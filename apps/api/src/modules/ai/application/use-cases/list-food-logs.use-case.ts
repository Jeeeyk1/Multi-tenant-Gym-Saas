import { Injectable } from '@nestjs/common';
import { AiRepository } from '../../infrastructure/persistence/ai.repository';
import { NotFoundError } from '../../../../common/errors';

@Injectable()
export class ListFoodLogsUseCase {
  constructor(private readonly aiRepository: AiRepository) {}

  /** `date` (YYYY-MM-DD) limits the list to that day in the gym's timezone. */
  async execute(memberId: string, gymId: string, limit = 20, date?: string) {
    const timezone = await this.aiRepository.findMemberGymTimezone(memberId, gymId);
    if (!timezone) throw new NotFoundError('Member not found', 'MEMBER_NOT_FOUND');

    return this.aiRepository.listFoodLogs(memberId, limit, date ? { date, timezone } : undefined);
  }
}
