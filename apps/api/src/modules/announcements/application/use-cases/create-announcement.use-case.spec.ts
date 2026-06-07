import { CreateAnnouncementUseCase } from './create-announcement.use-case';
import type { AnnouncementsRepository } from '../../infrastructure/persistence/announcements.repository';

const mockRepo = {
  create: jest.fn(),
} as unknown as jest.Mocked<AnnouncementsRepository>;

function makeStaff(permissions: string[] = ['announcements.manage']) {
  return { type: 'gym' as const, sub: 'user-1', gymId: 'gym-1', permissions, roles: [] };
}

describe('CreateAnnouncementUseCase', () => {
  beforeEach(() => jest.resetAllMocks());

  it('creates a PUBLISHED announcement when publishAt is not provided', async () => {
    mockRepo.create.mockResolvedValue({ id: 'ann-1', status: 'PUBLISHED' } as any);

    const uc = new CreateAnnouncementUseCase(mockRepo);
    await uc.execute('gym-1', { title: 'Hello', content: 'Body' }, makeStaff());

    expect(mockRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'PUBLISHED', gymId: 'gym-1' }),
    );
  });

  it('creates a PUBLISHED announcement when publishAt is in the past', async () => {
    mockRepo.create.mockResolvedValue({ id: 'ann-1', status: 'PUBLISHED' } as any);
    const past = new Date(Date.now() - 60_000);

    const uc = new CreateAnnouncementUseCase(mockRepo);
    await uc.execute('gym-1', { title: 'Hi', content: 'Body', publishAt: past }, makeStaff());

    expect(mockRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'PUBLISHED' }),
    );
  });

  it('creates a SCHEDULED announcement when publishAt is in the future', async () => {
    mockRepo.create.mockResolvedValue({ id: 'ann-1', status: 'SCHEDULED' } as any);
    const future = new Date(Date.now() + 60_000);

    const uc = new CreateAnnouncementUseCase(mockRepo);
    await uc.execute('gym-1', { title: 'Hi', content: 'Body', publishAt: future }, makeStaff());

    expect(mockRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'SCHEDULED' }),
    );
  });

  it('throws PERMISSION_DENIED when caller lacks announcements.manage', async () => {
    const uc = new CreateAnnouncementUseCase(mockRepo);
    await expect(
      uc.execute('gym-1', { title: 'Hi', content: 'Body' }, makeStaff([])),
    ).rejects.toMatchObject({ code: 'PERMISSION_DENIED' });
  });

  it('throws GYM_ACCESS_DENIED when caller belongs to a different gym', async () => {
    const caller = { type: 'gym' as const, sub: 'u', gymId: 'other-gym', permissions: ['announcements.manage'], roles: [] };
    const uc = new CreateAnnouncementUseCase(mockRepo);
    await expect(
      uc.execute('gym-1', { title: 'Hi', content: 'Body' }, caller),
    ).rejects.toMatchObject({ code: 'GYM_ACCESS_DENIED' });
  });

  it('sets isPinned from input', async () => {
    mockRepo.create.mockResolvedValue({ id: 'ann-1' } as any);

    const uc = new CreateAnnouncementUseCase(mockRepo);
    await uc.execute('gym-1', { title: 'Hi', content: 'Body', isPinned: true }, makeStaff());

    expect(mockRepo.create).toHaveBeenCalledWith(expect.objectContaining({ isPinned: true }));
  });
});
