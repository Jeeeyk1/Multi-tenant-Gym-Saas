import { UpdateAnnouncementUseCase } from './update-announcement.use-case';
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

describe('UpdateAnnouncementUseCase', () => {
  beforeEach(() => jest.resetAllMocks());

  it('updates fields on a PUBLISHED announcement', async () => {
    mockRepo.findById.mockResolvedValue(makeAnnouncement('PUBLISHED'));
    mockRepo.update.mockResolvedValue({ id: 'ann-1', title: 'New Title' } as any);

    const uc = new UpdateAnnouncementUseCase(mockRepo);
    await uc.execute('gym-1', 'ann-1', { title: 'New Title' }, makeStaff());

    expect(mockRepo.update).toHaveBeenCalledWith('ann-1', expect.objectContaining({ title: 'New Title' }));
  });

  it('sets status to SCHEDULED when publishAt is updated to future', async () => {
    mockRepo.findById.mockResolvedValue(makeAnnouncement('DRAFT'));
    mockRepo.update.mockResolvedValue({ id: 'ann-1' } as any);
    const future = new Date(Date.now() + 60_000);

    const uc = new UpdateAnnouncementUseCase(mockRepo);
    await uc.execute('gym-1', 'ann-1', { publishAt: future }, makeStaff());

    expect(mockRepo.update).toHaveBeenCalledWith(
      'ann-1',
      expect.objectContaining({ status: 'SCHEDULED', publishAt: future }),
    );
  });

  it('throws ANNOUNCEMENT_NOT_FOUND when announcement does not exist', async () => {
    mockRepo.findById.mockResolvedValue(null);

    const uc = new UpdateAnnouncementUseCase(mockRepo);
    await expect(
      uc.execute('gym-1', 'ann-1', { title: 'X' }, makeStaff()),
    ).rejects.toMatchObject({ code: 'ANNOUNCEMENT_NOT_FOUND' });
  });

  it('throws ANNOUNCEMENT_NOT_EDITABLE when status is EXPIRED', async () => {
    mockRepo.findById.mockResolvedValue(makeAnnouncement('EXPIRED'));

    const uc = new UpdateAnnouncementUseCase(mockRepo);
    await expect(
      uc.execute('gym-1', 'ann-1', { title: 'X' }, makeStaff()),
    ).rejects.toMatchObject({ code: 'ANNOUNCEMENT_NOT_EDITABLE' });
  });

  it('throws ANNOUNCEMENT_NOT_EDITABLE when status is ARCHIVED', async () => {
    mockRepo.findById.mockResolvedValue(makeAnnouncement('ARCHIVED'));

    const uc = new UpdateAnnouncementUseCase(mockRepo);
    await expect(
      uc.execute('gym-1', 'ann-1', { title: 'X' }, makeStaff()),
    ).rejects.toMatchObject({ code: 'ANNOUNCEMENT_NOT_EDITABLE' });
  });

  it('throws PERMISSION_DENIED when caller lacks announcements.manage', async () => {
    const uc = new UpdateAnnouncementUseCase(mockRepo);
    await expect(
      uc.execute('gym-1', 'ann-1', { title: 'X' }, makeStaff([])),
    ).rejects.toMatchObject({ code: 'PERMISSION_DENIED' });
  });
});
