import { ArchiveAnnouncementUseCase } from './archive-announcement.use-case';
import type { AnnouncementsRepository } from '../../infrastructure/persistence/announcements.repository';

const mockRepo = {
  findById: jest.fn(),
  update: jest.fn(),
} as unknown as jest.Mocked<AnnouncementsRepository>;

function makeStaff(permissions: string[] = ['announcements.manage']) {
  return { type: 'gym' as const, sub: 'user-1', gymId: 'gym-1', permissions, roles: [] };
}

function makeAnnouncement(status = 'PUBLISHED') {
  return { id: 'ann-1', gymId: 'gym-1', status } as any;
}

describe('ArchiveAnnouncementUseCase', () => {
  beforeEach(() => jest.resetAllMocks());

  it('archives a PUBLISHED announcement', async () => {
    mockRepo.findById.mockResolvedValue(makeAnnouncement('PUBLISHED'));
    mockRepo.update.mockResolvedValue({ id: 'ann-1', status: 'ARCHIVED' } as any);

    const uc = new ArchiveAnnouncementUseCase(mockRepo);
    await uc.execute('gym-1', 'ann-1', makeStaff());

    expect(mockRepo.update).toHaveBeenCalledWith('ann-1', { status: 'ARCHIVED' });
  });

  it('archives a DRAFT announcement', async () => {
    mockRepo.findById.mockResolvedValue(makeAnnouncement('DRAFT'));
    mockRepo.update.mockResolvedValue({ id: 'ann-1', status: 'ARCHIVED' } as any);

    const uc = new ArchiveAnnouncementUseCase(mockRepo);
    await uc.execute('gym-1', 'ann-1', makeStaff());

    expect(mockRepo.update).toHaveBeenCalledWith('ann-1', { status: 'ARCHIVED' });
  });

  it('throws ANNOUNCEMENT_NOT_ARCHIVABLE when already ARCHIVED', async () => {
    mockRepo.findById.mockResolvedValue(makeAnnouncement('ARCHIVED'));

    const uc = new ArchiveAnnouncementUseCase(mockRepo);
    await expect(
      uc.execute('gym-1', 'ann-1', makeStaff()),
    ).rejects.toMatchObject({ code: 'ANNOUNCEMENT_NOT_ARCHIVABLE' });
  });

  it('throws ANNOUNCEMENT_NOT_ARCHIVABLE when EXPIRED', async () => {
    mockRepo.findById.mockResolvedValue(makeAnnouncement('EXPIRED'));

    const uc = new ArchiveAnnouncementUseCase(mockRepo);
    await expect(
      uc.execute('gym-1', 'ann-1', makeStaff()),
    ).rejects.toMatchObject({ code: 'ANNOUNCEMENT_NOT_ARCHIVABLE' });
  });

  it('throws ANNOUNCEMENT_NOT_FOUND when not found', async () => {
    mockRepo.findById.mockResolvedValue(null);

    const uc = new ArchiveAnnouncementUseCase(mockRepo);
    await expect(
      uc.execute('gym-1', 'ann-1', makeStaff()),
    ).rejects.toMatchObject({ code: 'ANNOUNCEMENT_NOT_FOUND' });
  });

  it('throws PERMISSION_DENIED when caller lacks announcements.manage', async () => {
    const uc = new ArchiveAnnouncementUseCase(mockRepo);
    await expect(
      uc.execute('gym-1', 'ann-1', makeStaff([])),
    ).rejects.toMatchObject({ code: 'PERMISSION_DENIED' });
  });
});
