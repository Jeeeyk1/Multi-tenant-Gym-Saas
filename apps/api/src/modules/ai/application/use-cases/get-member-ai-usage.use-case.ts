import { Injectable } from '@nestjs/common';
import { NotFoundError } from '../../../../common/errors';
import { AiRepository } from '../../infrastructure/persistence/ai.repository';
import { MemberAiLimitsService, type MemberAiUsage } from '../member-ai-limits.service';

/** How much of each AI feature the member has left this month. */
@Injectable()
export class GetMemberAiUsageUseCase {
  constructor(
    private readonly aiRepository: AiRepository,
    private readonly limits: MemberAiLimitsService,
  ) {}

  async execute(memberId: string, gymId: string): Promise<MemberAiUsage> {
    const ctx = await this.aiRepository.findMemberContext(memberId, gymId);
    if (!ctx) throw new NotFoundError('Member not found', 'MEMBER_NOT_FOUND');
    return this.limits.getUsage(ctx);
  }
}
