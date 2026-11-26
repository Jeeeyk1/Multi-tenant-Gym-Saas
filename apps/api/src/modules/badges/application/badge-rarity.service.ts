import { Injectable, Logger } from '@nestjs/common';
import { CacheService } from '../../../common/cache/cache.service';
import { BadgeRarity } from '../../../common/enums';
import { BadgesRepository } from '../infrastructure/persistence/badges.repository';
import { badgeRarity, badgeSharePct } from '../domain/badge-rarity';

// Rarity changes slowly; counting every badge holder on each chat or collection load isn't needed.
const RARITY_TTL_SECONDS = 900;

export interface RarityInfo {
  /** Share of active members holding the badge, 0–100. */
  sharePct: number | null;
  rarity: BadgeRarity | null;
}

/** How rare each badge is in a gym, keyed by `badgeKey()`. */
@Injectable()
export class BadgeRarityService {
  private readonly logger = new Logger(BadgeRarityService.name);

  constructor(
    private readonly repo: BadgesRepository,
    private readonly cache: CacheService,
  ) {}

  async lookup(gymId: string): Promise<(key: string) => RarityInfo> {
    const { activeMembers, holders } = await this.cache.wrap(`badges:rarity:${gymId}`, RARITY_TTL_SECONDS, async () => {
      const counts = await this.repo.getBadgeHolderCounts(gymId);
      // Answers "why is this badge legendary?" for the next 15 minutes of cached reads.
      const tiers = Object.values(counts.holders).map((n) => badgeRarity(n, counts.activeMembers));
      this.logger.debug(
        `rarity recounted gym=${gymId} activeMembers=${counts.activeMembers} badges=${tiers.length} ` +
          `legendary=${tiers.filter((t) => t === BadgeRarity.LEGENDARY).length} epic=${tiers.filter((t) => t === BadgeRarity.EPIC).length}`,
      );
      return counts;
    });
    return (key) => {
      const count = holders[key] ?? 0;
      return { sharePct: badgeSharePct(count, activeMembers), rarity: badgeRarity(count, activeMembers) };
    };
  }
}
