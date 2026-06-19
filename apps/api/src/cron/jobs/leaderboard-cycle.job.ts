import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { CronLockService } from '../shared/cron-lock.service';
import { CRON_LOCK_TTL, CRON_SCHEDULE } from '../../config/cron.config';
import { BadgesRepository } from '../../modules/badges/infrastructure/persistence/badges.repository';
import { CloseCycleUseCase } from '../../modules/badges/application/use-cases/close-cycle.use-case';

const LOCK_KEY = 'lock:cron:leaderboard-cycle';
const CYCLE_DURATION_DAYS = 14;

@Injectable()
export class LeaderboardCycleJob {
  private readonly logger = new Logger(LeaderboardCycleJob.name);

  constructor(
    private readonly badgesRepo: BadgesRepository,
    private readonly closeCycleUseCase: CloseCycleUseCase,
    private readonly lock: CronLockService,
  ) {}

  @Cron(CRON_SCHEDULE.LEADERBOARD_CYCLE)
  async run(): Promise<void> {
    await this.lock.withLock(LOCK_KEY, CRON_LOCK_TTL.LEADERBOARD_CYCLE, async () => {
      this.logger.log('started');
      const start = Date.now();
      let closed = 0;

      try {
        const oldCycles = await this.badgesRepo.getOldActiveCycles(CYCLE_DURATION_DAYS);

        for (const cycle of oldCycles) {
          await this.closeCycleUseCase.execute(cycle.id, cycle.gymId, cycle.startedAt);
          closed++;
        }

        this.logger.log(`closed ${closed} cycles in ${Date.now() - start}ms`);
      } catch (err) {
        this.logger.error('failed', err instanceof Error ? err.message : String(err));
      }

      this.logger.log('completed');
    });
  }
}
