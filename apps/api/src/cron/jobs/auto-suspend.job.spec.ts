import { AutoSuspendJob } from './auto-suspend.job';
import type { PrismaService } from '../../common/prisma/prisma.service';
import type { CronLockService } from '../shared/cron-lock.service';

function makeLock(acquired = true): jest.Mocked<CronLockService> {
  return {
    withLock: jest.fn(async (_key, _ttl, fn) => {
      if (acquired) await fn();
    }),
  } as unknown as jest.Mocked<CronLockService>;
}

const mockPrisma = {
  gymMember: {
    findMany: jest.fn(),
    updateMany: jest.fn(),
  },
// eslint-disable-next-line @typescript-eslint/no-explicit-any
} as any;

// Member expired 4 months ago, gym threshold = 3 months → should suspend
function expiredMember(monthsAgo: number, autoSuspendMonths = 3) {
  const expiry = new Date();
  expiry.setMonth(expiry.getMonth() - monthsAgo);
  return { id: `m-${monthsAgo}`, expiryDate: expiry, gym: { autoSuspendMonths } };
}

describe('AutoSuspendJob', () => {
  beforeEach(() => jest.resetAllMocks());

  it('suspends EXPIRED members past the gym threshold', async () => {
    const batch = [
      expiredMember(4), // 4 months ago, threshold 3 → suspend
      expiredMember(1), // 1 month ago, threshold 3 → skip
    ];
    mockPrisma.gymMember.findMany.mockResolvedValue(batch as any);
    mockPrisma.gymMember.updateMany.mockResolvedValue({ count: 1 } as any);

    const job = new AutoSuspendJob(mockPrisma, makeLock());
    await job.run();

    expect(mockPrisma.gymMember.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: { in: [`m-4`] } },
        data: expect.objectContaining({ status: 'SUSPENDED' }),
      }),
    );
  });

  it('skips updateMany when no members meet the threshold', async () => {
    mockPrisma.gymMember.findMany.mockResolvedValue([expiredMember(1)] as any);

    const job = new AutoSuspendJob(mockPrisma, makeLock());
    await job.run();

    expect(mockPrisma.gymMember.updateMany).not.toHaveBeenCalled();
  });

  it('skips all db work when lock is already held', async () => {
    const job = new AutoSuspendJob(mockPrisma, makeLock(false));
    await job.run();

    expect(mockPrisma.gymMember.findMany).not.toHaveBeenCalled();
  });

  it('does nothing when no EXPIRED members exist', async () => {
    mockPrisma.gymMember.findMany.mockResolvedValue([] as any);

    const job = new AutoSuspendJob(mockPrisma, makeLock());
    await job.run();

    expect(mockPrisma.gymMember.updateMany).not.toHaveBeenCalled();
  });
});
