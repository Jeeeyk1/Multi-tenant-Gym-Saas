import { MembershipExpiryJob } from './membership-expiry.job';
import type { PrismaService } from '../../common/prisma/prisma.service';
import type { CronLockService } from '../shared/cron-lock.service';

// withLock mock that invokes fn (lock acquired)
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

describe('MembershipExpiryJob', () => {
  beforeEach(() => jest.resetAllMocks());

  it('updates ACTIVE members past expiry to EXPIRED in batches', async () => {
    const batch = [{ id: 'member-1' }, { id: 'member-2' }];
    mockPrisma.gymMember.findMany
      .mockResolvedValueOnce(batch as any) // first batch (< 100 → last)
      .mockResolvedValueOnce([] as any);   // would not be called but safety

    mockPrisma.gymMember.updateMany.mockResolvedValue({ count: 2 } as any);

    const job = new MembershipExpiryJob(mockPrisma, makeLock());
    await job.run();

    expect(mockPrisma.gymMember.findMany).toHaveBeenCalledTimes(1);
    expect(mockPrisma.gymMember.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: { in: ['member-1', 'member-2'] } },
        data: expect.objectContaining({ status: 'EXPIRED' }),
      }),
    );
  });

  it('loops until no more records remain', async () => {
    const fullBatch = Array.from({ length: 100 }, (_, i) => ({ id: `m-${i}` }));
    mockPrisma.gymMember.findMany
      .mockResolvedValueOnce(fullBatch as any) // first batch = 100 → continue
      .mockResolvedValueOnce([] as any);       // second batch = 0 → stop

    mockPrisma.gymMember.updateMany.mockResolvedValue({ count: 100 } as any);

    const job = new MembershipExpiryJob(mockPrisma, makeLock());
    await job.run();

    expect(mockPrisma.gymMember.findMany).toHaveBeenCalledTimes(2);
    expect(mockPrisma.gymMember.updateMany).toHaveBeenCalledTimes(1);
  });

  it('skips all db work when lock is already held', async () => {
    const job = new MembershipExpiryJob(mockPrisma, makeLock(false));
    await job.run();

    expect(mockPrisma.gymMember.findMany).not.toHaveBeenCalled();
    expect(mockPrisma.gymMember.updateMany).not.toHaveBeenCalled();
  });

  it('does nothing when no expired members exist', async () => {
    mockPrisma.gymMember.findMany.mockResolvedValue([] as any);

    const job = new MembershipExpiryJob(mockPrisma, makeLock());
    await job.run();

    expect(mockPrisma.gymMember.updateMany).not.toHaveBeenCalled();
  });
});
