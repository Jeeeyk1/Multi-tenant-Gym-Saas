import { AnnouncementPublisherJob } from './announcement-publisher.job';
import type { CronLockService } from '../shared/cron-lock.service';

function makeLock(acquired = true): jest.Mocked<CronLockService> {
  return {
    withLock: jest.fn(async (_key, _ttl, fn) => {
      if (acquired) await fn();
    }),
  } as unknown as jest.Mocked<CronLockService>;
}

const mockPrisma = {
  announcement: {
    updateMany: jest.fn(),
  },
// eslint-disable-next-line @typescript-eslint/no-explicit-any
} as any;

describe('AnnouncementPublisherJob', () => {
  beforeEach(() => jest.resetAllMocks());

  it('publishes SCHEDULED announcements whose publish_at has passed', async () => {
    mockPrisma.announcement.updateMany
      .mockResolvedValueOnce({ count: 3 } as any) // publish
      .mockResolvedValueOnce({ count: 0 } as any); // expire

    const job = new AnnouncementPublisherJob(mockPrisma, makeLock());
    await job.run();

    expect(mockPrisma.announcement.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: 'SCHEDULED' }),
        data: expect.objectContaining({ status: 'PUBLISHED' }),
      }),
    );
  });

  it('expires PUBLISHED announcements whose expires_at has passed', async () => {
    mockPrisma.announcement.updateMany
      .mockResolvedValueOnce({ count: 0 } as any) // publish
      .mockResolvedValueOnce({ count: 2 } as any); // expire

    const job = new AnnouncementPublisherJob(mockPrisma, makeLock());
    await job.run();

    expect(mockPrisma.announcement.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: 'PUBLISHED' }),
        data: expect.objectContaining({ status: 'EXPIRED' }),
      }),
    );
  });

  it('runs both publish and expire in the same cycle', async () => {
    mockPrisma.announcement.updateMany
      .mockResolvedValueOnce({ count: 2 } as any)
      .mockResolvedValueOnce({ count: 1 } as any);

    const job = new AnnouncementPublisherJob(mockPrisma, makeLock());
    await job.run();

    expect(mockPrisma.announcement.updateMany).toHaveBeenCalledTimes(2);
  });

  it('skips all db work when lock is already held', async () => {
    const job = new AnnouncementPublisherJob(mockPrisma, makeLock(false));
    await job.run();

    expect(mockPrisma.announcement.updateMany).not.toHaveBeenCalled();
  });
});
