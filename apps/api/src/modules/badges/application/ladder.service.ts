import { Injectable, Logger } from '@nestjs/common';
import { CacheService } from '../../../common/cache/cache.service';
import { BadgesRepository } from '../infrastructure/persistence/badges.repository';
import { defaultLadderRows } from '../domain/ladder-rows';

const ENSURED_TTL_SECONDS = 300;

/** Keeps every leaderboard lift on a ladder and credits rungs that past lifts already reached. */
@Injectable()
export class LadderService {
  private readonly logger = new Logger(LadderService.name);

  constructor(
    private readonly repo: BadgesRepository,
    private readonly cache: CacheService,
  ) {}

  /** Cheap to call on reads: the check runs at most every few minutes per gym. */
  async ensureDefaultLaddersCached(gymId: string): Promise<void> {
    await this.cache.wrap(`badges:ladders-ensured:${gymId}`, ENSURED_TTL_SECONDS, async () => {
      await this.ensureDefaultLadders(gymId);
      return true;
    });
  }

  async ensureDefaultLadders(gymId: string): Promise<void> {
    const rungs = await this.repo.createMissingLadders(gymId, (exercise) => defaultLadderRows(gymId, exercise));
    if (rungs.length === 0) return;
    let credited = 0;
    for (const rung of rungs) credited += await this.repo.awardRungForExistingLifts(gymId, rung);
    this.logger.log(`default ladders created gym=${gymId} rungs=${rungs.length} credited=${credited}`);
  }
}
