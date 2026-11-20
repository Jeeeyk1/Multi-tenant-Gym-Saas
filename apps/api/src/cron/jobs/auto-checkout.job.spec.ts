import { AutoCheckoutJob } from './auto-checkout.job';
import type { CronLockService } from '../shared/cron-lock.service';

function makeLock(acquired = true): jest.Mocked<CronLockService> {
  return {
    withLock: jest.fn(async (_key, _ttl, fn) => {
      if (acquired) await fn();
    }),
  } as unknown as jest.Mocked<CronLockService>;
}

const mockPrisma = {
  checkIn: {
    findMany: jest.fn(),
    updateMany: jest.fn(),
  },
// eslint-disable-next-line @typescript-eslint/no-explicit-any
} as any;

function openCheckin(hoursAgo: number, autoCheckoutHours = 5) {
  const checkedInAt = new Date(Date.now() - hoursAgo * 60 * 60 * 1000);
  return { id: `ci-${hoursAgo}h`, checkedInAt, gym: { autoCheckoutHours } };
}

describe('AutoCheckoutJob', () => {
  beforeEach(() => jest.resetAllMocks());

  it('closes stale check-ins past the gym threshold', async () => {
    const batch = [
      openCheckin(6), // 6h ago, threshold 5h → close
      openCheckin(2), // 2h ago, threshold 5h → skip
    ];
    mockPrisma.checkIn.findMany.mockResolvedValue(batch as any);
    mockPrisma.checkIn.updateMany.mockResolvedValue({ count: 1 } as any);

    const job = new AutoCheckoutJob(mockPrisma, makeLock());
    await job.run();

    expect(mockPrisma.checkIn.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: { in: ['ci-6h'] } },
        data: expect.objectContaining({ isAutoCheckout: true }),
      }),
    );
  });

  it('skips updateMany when no check-ins meet the threshold', async () => {
    mockPrisma.checkIn.findMany.mockResolvedValue([openCheckin(1)] as any);

    const job = new AutoCheckoutJob(mockPrisma, makeLock());
    await job.run();

    expect(mockPrisma.checkIn.updateMany).not.toHaveBeenCalled();
  });

  it('skips all db work when lock is already held', async () => {
    const job = new AutoCheckoutJob(mockPrisma, makeLock(false));
    await job.run();

    expect(mockPrisma.checkIn.findMany).not.toHaveBeenCalled();
  });

  it('does nothing when no open check-ins exist', async () => {
    mockPrisma.checkIn.findMany.mockResolvedValue([] as any);

    const job = new AutoCheckoutJob(mockPrisma, makeLock());
    await job.run();

    expect(mockPrisma.checkIn.updateMany).not.toHaveBeenCalled();
  });

  it('pages past a full batch of check-ins that are not stale yet', async () => {
    // 100 fresh check-ins: none qualify, so nothing is updated and they stay open.
    const fresh = Array.from({ length: 100 }, (_, i) => ({ ...openCheckin(1), id: `ci-${i}` }));
    mockPrisma.checkIn.findMany
      .mockResolvedValueOnce(fresh as any)
      .mockResolvedValueOnce([{ ...openCheckin(6), id: 'ci-stale' }] as any);
    mockPrisma.checkIn.updateMany.mockResolvedValue({ count: 1 } as any);

    const job = new AutoCheckoutJob(mockPrisma, makeLock());
    await job.run();

    expect(mockPrisma.checkIn.findMany).toHaveBeenCalledTimes(2);
    expect(mockPrisma.checkIn.findMany.mock.calls[0][0].where).toEqual({ checkedOutAt: null });
    expect(mockPrisma.checkIn.findMany.mock.calls[1][0].where).toEqual({
      checkedOutAt: null,
      id: { gt: 'ci-99' },
    });
    expect(mockPrisma.checkIn.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: { in: ['ci-stale'] } } }),
    );
  });
});
