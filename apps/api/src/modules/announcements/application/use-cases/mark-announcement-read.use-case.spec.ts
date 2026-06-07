import { MarkAnnouncementReadUseCase } from './mark-announcement-read.use-case';
import type { AnnouncementsRepository } from '../../infrastructure/persistence/announcements.repository';

const mockRepo = {
  findById: jest.fn(),
  markRead: jest.fn(),
} as unknown as jest.Mocked<AnnouncementsRepository>;

function makeCaller(gymId = 'gym-1') {
  return { type: 'gym' as const, sub: 'user-1', gymId, permissions: [], roles: [] };
}

function makeAnnouncement(status = 'PUBLISHED') {
  return { id: 'ann-1', gymId: 'gym-1', status } as any;
}

describe('MarkAnnouncementReadUseCase', () => {
  beforeEach(() => jest.resetAllMocks());

  it('marks a PUBLISHED announcement as read', async () => {
    mockRepo.findById.mockResolvedValue(makeAnnouncement('PUBLISHED'));
    mockRepo.markRead.mockResolvedValue(undefined);

    const uc = new MarkAnnouncementReadUseCase(mockRepo);
    const result = await uc.execute('gym-1', 'ann-1', makeCaller());

    expect(mockRepo.markRead).toHaveBeenCalledWith('ann-1', 'user-1');
    expect(result).toEqual({ ok: true });
  });

  it('throws ANNOUNCEMENT_NOT_FOUND when announcement does not exist', async () => {
    mockRepo.findById.mockResolvedValue(null);

    const uc = new MarkAnnouncementReadUseCase(mockRepo);
    await expect(
      uc.execute('gym-1', 'ann-1', makeCaller()),
    ).rejects.toMatchObject({ code: 'ANNOUNCEMENT_NOT_FOUND' });
  });

  it('throws ANNOUNCEMENT_NOT_FOUND when announcement is not PUBLISHED', async () => {
    mockRepo.findById.mockResolvedValue(makeAnnouncement('DRAFT'));

    const uc = new MarkAnnouncementReadUseCase(mockRepo);
    await expect(
      uc.execute('gym-1', 'ann-1', makeCaller()),
    ).rejects.toMatchObject({ code: 'ANNOUNCEMENT_NOT_FOUND' });
  });

  it('throws GYM_ACCESS_DENIED when caller belongs to a different gym', async () => {
    const uc = new MarkAnnouncementReadUseCase(mockRepo);
    await expect(
      uc.execute('gym-1', 'ann-1', makeCaller('other-gym')),
    ).rejects.toMatchObject({ code: 'GYM_ACCESS_DENIED' });
  });

  it('does not throw when announcement has already been read (idempotent upsert)', async () => {
    mockRepo.findById.mockResolvedValue(makeAnnouncement('PUBLISHED'));
    mockRepo.markRead.mockResolvedValue(undefined); // upsert silently ignores duplicates

    const uc = new MarkAnnouncementReadUseCase(mockRepo);
    await expect(
      uc.execute('gym-1', 'ann-1', makeCaller()),
    ).resolves.toEqual({ ok: true });
  });
});
