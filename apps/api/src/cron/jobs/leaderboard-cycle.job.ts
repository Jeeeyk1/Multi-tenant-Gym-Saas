import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { CronLockService } from '../shared/cron-lock.service';
import { CRON_LOCK_TTL, CRON_SCHEDULE } from '../../config/cron.config';
import { BadgesService } from '../../modules/badges/badges.service';
import { CloseCycleUseCase } from '../../modules/badges/application/use-cases/close-cycle.use-case';

const LOCK_KEY = 'lock:cron:leaderboard-cycle';
const CYCLE_DURATION_DAYS = 14;

@Injectable()
export class LeaderboardCycleJob {
  private readonly logger = new Logger(LeaderboardCycleJob.name);

  constructor(
    private readonly badgesService: BadgesService,
    private readonly closeCycleUseCase: CloseCycleUseCase,
    private readonly lock: CronLockService,
  ) {}

  @Cron(CRON_SCHEDULE.LEADERBOARD_CYCLE)
  async run(): Promise<void> {
    await this.lock.withLock(LOCK_KEY, CRON_LOCK_TTL.LEADERBOARD_CYCLE, async () => {
      this.logger.log('started');
      const start = Date.now();
      let closed = 0;
      let failed = 0;

      let oldCycles: Awaited<ReturnType<BadgesService['getOldActiveCycles']>> = [];
      try {
        oldCycles = await this.badgesService.getOldActiveCycles(CYCLE_DURATION_DAYS);
      } catch (err) {
        this.logger.error('loading cycles to close failed', err instanceof Error ? err.stack : String(err));
      }
      // One gym failing must not stop the others; its cycle stays active and is retried next run.
      for (const cycle of oldCycles) {
        try {
          await this.closeCycleUseCase.execute(cycle.id, cycle.gymId, cycle.startedAt);
          closed++;
        } catch (err) {
          failed++;
          this.logger.error(
            `cycle close failed cycle=${cycle.id} gym=${cycle.gymId}`,
            err instanceof Error ? err.stack : String(err),
          );
        }
      }

      let unequipped = 0;
      try {
        unequipped = await this.badgesService.unequipExpiredBadges();
      } catch (err) {
        this.logger.error('unequip expired badges failed', err instanceof Error ? err.stack : String(err));
      }
      this.logger.log(
        `closed ${closed}/${oldCycles.length} cycles (${failed} failed), unequipped ${unequipped} expired badges in ${Date.now() - start}ms`,
      );

      this.logger.log('completed');
    });
  }
}
