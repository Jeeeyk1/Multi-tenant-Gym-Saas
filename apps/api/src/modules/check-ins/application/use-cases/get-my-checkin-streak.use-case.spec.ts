import { GetMyCheckinStreakUseCase } from './get-my-checkin-streak.use-case';
import type { CheckInsRepository } from '../../infrastructure/persistence/check-ins.repository';
import type { AuthenticatedUser } from '../../../../common/types/auth.types';

const mockRepo = {
  findMemberByUserId: jest.fn(),
  getGymTimezone: jest.fn(),
  listCheckinTimestamps: jest.fn(),
} as unknown as jest.Mocked<CheckInsRepository>;

const memberCaller: AuthenticatedUser = {
  type: 'gym',
  sub: 'member-user-1',
  gymId: 'gym-1',
  roles: ['MEMBER'],
  permissions: ['checkins.self'],
};

// 27 Nov 2026, 10:00 in Manila (UTC+8)
const NOW = new Date('2026-11-27T02:00:00Z');

describe('GetMyCheckinStreakUseCase', () => {
  let useCase: GetMyCheckinStreakUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new GetMyCheckinStreakUseCase(mockRepo);
    mockRepo.findMemberByUserId.mockResolvedValue({ id: 'member-1' } as any);
    mockRepo.getGymTimezone.mockResolvedValue('Asia/Manila');
  });

  it('counts consecutive local days ending today, beyond the last 7 check-ins', async () => {
    // Today at 9:30 AM Manila, then the nine days before at 7 PM Manila (11:00 UTC), newest first.
    const days = [
      new Date('2026-11-27T01:30:00Z'),
      ...Array.from({ length: 9 }, (_, i) => new Date(Date.UTC(2026, 10, 26 - i, 11, 0))),
    ];
    mockRepo.listCheckinTimestamps.mockResolvedValue(days);

    await expect(useCase.execute('gym-1', memberCaller, NOW)).resolves.toEqual({ streak: 10 });
    expect(mockRepo.listCheckinTimestamps).toHaveBeenCalledWith('member-1');
  });

  it('uses the gym timezone, not UTC, to decide the day', async () => {
    // 26 Nov 23:30 UTC is already 27 Nov 7:30 AM in Manila, so this is "today", and 25 Nov 20:00 UTC is 26 Nov.
    mockRepo.listCheckinTimestamps.mockResolvedValue([new Date('2026-11-26T23:30:00Z'), new Date('2026-11-25T20:00:00Z')]);

    await expect(useCase.execute('gym-1', memberCaller, NOW)).resolves.toEqual({ streak: 2 });
  });

  it('is 0 when the last check-in was before yesterday', async () => {
    mockRepo.listCheckinTimestamps.mockResolvedValue([new Date('2026-11-24T11:00:00Z')]);

    await expect(useCase.execute('gym-1', memberCaller, NOW)).resolves.toEqual({ streak: 0 });
  });

  it('throws MEMBER_NOT_FOUND when the caller is not a member of the gym', async () => {
    mockRepo.findMemberByUserId.mockResolvedValue(null);

    await expect(useCase.execute('gym-1', memberCaller, NOW)).rejects.toMatchObject({ code: 'MEMBER_NOT_FOUND' });
  });

  it('requires checkins.self', async () => {
    await expect(useCase.execute('gym-1', { ...memberCaller, permissions: [] }, NOW)).rejects.toMatchObject({
      code: 'PERMISSION_DENIED',
    });
  });
});
