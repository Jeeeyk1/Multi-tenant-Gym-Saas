import { Logger } from '@nestjs/common';
import { LeaderboardCycleJob } from './leaderboard-cycle.job';
import type { CronLockService } from '../shared/cron-lock.service';
import type { BadgesService } from '../../modules/badges/badges.service';
import type { CloseCycleUseCase } from '../../modules/badges/application/use-cases/close-cycle.use-case';

const lock = {
  withLock: jest.fn(async (_key: string, _ttl: number, fn: () => Promise<void>) => fn()),
} as unknown as jest.Mocked<CronLockService>;

const badges = {
  getOldActiveCycles: jest.fn(),
  unequipExpiredBadges: jest.fn(),
} as unknown as jest.Mocked<BadgesService>;

const closeCycle = { execute: jest.fn() } as unknown as jest.Mocked<CloseCycleUseCase>;

describe('LeaderboardCycleJob', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
  });

  it('keeps closing other gyms when one fails, then unequips expired badges', async () => {
    badges.getOldActiveCycles.mockResolvedValue([
      { id: 'c1', gymId: 'g1', startedAt: new Date() },
      { id: 'c2', gymId: 'g2', startedAt: new Date() },
    ] as never);
    closeCycle.execute.mockRejectedValueOnce(new Error('db down')).mockResolvedValueOnce(undefined);
    badges.unequipExpiredBadges.mockResolvedValue(2);

    await new LeaderboardCycleJob(badges, closeCycle, lock).run();

    expect(closeCycle.execute).toHaveBeenCalledTimes(2);
    expect(closeCycle.execute).toHaveBeenLastCalledWith('c2', 'g2', expect.any(Date));
    expect(badges.unequipExpiredBadges).toHaveBeenCalled();
    expect(Logger.prototype.error).toHaveBeenCalledWith('cycle close failed cycle=c1 gym=g1', expect.any(String));
  });

  it('still unequips expired badges when loading cycles fails', async () => {
    badges.getOldActiveCycles.mockRejectedValue(new Error('db down'));
    badges.unequipExpiredBadges.mockResolvedValue(0);

    await new LeaderboardCycleJob(badges, closeCycle, lock).run();

    expect(closeCycle.execute).not.toHaveBeenCalled();
    expect(badges.unequipExpiredBadges).toHaveBeenCalled();
  });
});
