import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Whether members must accept the community rules before posting (COMMUNITY_RULES_ENFORCED).
 * Off until the web and mobile builds that show the rules are live: older apps can't accept
 * them, so their members couldn't post at all.
 */
@Injectable()
export class CommunityRulesPolicy {
  constructor(private readonly config: ConfigService) {}

  isEnforced(): boolean {
    return this.config.get<boolean>('COMMUNITY_RULES_ENFORCED', false) === true;
  }
}
