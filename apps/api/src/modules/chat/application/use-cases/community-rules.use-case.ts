import { Injectable, Logger } from '@nestjs/common';
import { ValidationError } from '../../../../common/errors';
import { assertGymAccess } from '../../../../common/auth/authorization';
import type { AuthenticatedUser } from '../../../../common/types/auth.types';
import { COMMUNITY_RULES, COMMUNITY_RULES_VERSION } from '../../domain/community-rules';
import { ChatSafetyRepository } from '../../infrastructure/persistence/chat-safety.repository';
import { CommunityRulesPolicy } from '../community-rules.policy';

export interface CommunityRulesView {
  version: number;
  rules: readonly string[];
  /** Whether the caller accepted this version. */
  accepted: boolean;
  /** Whether members must accept before posting (so the app knows to ask first). */
  required: boolean;
}

@Injectable()
export class GetCommunityRulesUseCase {
  constructor(
    private readonly repo: ChatSafetyRepository,
    private readonly policy: CommunityRulesPolicy,
  ) {}

  async execute(gymId: string, caller: AuthenticatedUser): Promise<CommunityRulesView> {
    assertGymAccess(caller, gymId);
    const accepted = (await this.repo.rulesVersion(caller.sub)) === COMMUNITY_RULES_VERSION;
    return { version: COMMUNITY_RULES_VERSION, rules: COMMUNITY_RULES, accepted, required: this.policy.isEnforced() };
  }
}

@Injectable()
export class AcceptCommunityRulesUseCase {
  private readonly logger = new Logger(AcceptCommunityRulesUseCase.name);

  constructor(
    private readonly repo: ChatSafetyRepository,
    private readonly policy: CommunityRulesPolicy,
  ) {}

  async execute(gymId: string, version: number, caller: AuthenticatedUser): Promise<CommunityRulesView> {
    assertGymAccess(caller, gymId);
    // The person must have seen the current rules, not an older copy cached in the app.
    if (version !== COMMUNITY_RULES_VERSION) {
      throw new ValidationError('The community rules changed. Please read them again.', 'RULES_OUTDATED');
    }
    await this.repo.acceptRules(caller.sub, version);
    this.logger.log(`community rules accepted user=${caller.sub} version=${version}`);
    return { version, rules: COMMUNITY_RULES, accepted: true, required: this.policy.isEnforced() };
  }
}
