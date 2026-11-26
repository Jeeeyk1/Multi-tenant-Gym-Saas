import { Injectable } from '@nestjs/common';
import { AiAllowanceService, type AssistantUsage } from '../../../ai-usage/application/ai-allowance.service';
import type { PoolStatus } from '../../../ai-usage/domain/ai-allowance';
import { assertGymAccess, assertPermission, hasPermission } from '../../../../common/auth/authorization';
import { Permission } from '../../../../common/enums';
import type { AuthenticatedUser } from '../../../../common/types/auth.types';

export interface AiUsageView {
  /** Null when the gym has no active subscription. */
  assistant: AssistantUsage | null;
  /** Members' AI pool. Owner only (it's a cost figure). */
  members: PoolStatus | null;
  /** Whether this person can ask revenue questions (shown in the assistant's "what I can do" panel). */
  canAskRevenue: boolean;
}

/** For the usage meter next to the AI assistant. */
@Injectable()
export class GetAiUsageUseCase {
  constructor(private readonly allowance: AiAllowanceService) {}

  async execute(gymId: string, caller: AuthenticatedUser): Promise<AiUsageView> {
    assertGymAccess(caller, gymId);
    assertPermission(caller, Permission.INSIGHTS_QUERY);
    const canAskRevenue = hasPermission(caller, Permission.REPORTS_VIEW);
    const [assistant, members] = await Promise.all([
      this.allowance.assistantUsage(gymId, caller),
      canAskRevenue ? this.allowance.memberPool(gymId) : Promise.resolve(null),
    ]);
    return { assistant, members, canAskRevenue };
  }
}
