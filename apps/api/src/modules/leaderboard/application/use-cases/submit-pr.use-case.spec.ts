import { SubmitPrUseCase } from './submit-pr.use-case';
import type { LeaderboardRepository } from '../../infrastructure/persistence/leaderboard.repository';
import type { CacheService } from '../../../../common/cache/cache.service';
import type { GymAuthUser } from '../../../../common/types/auth.types';

const mockRepo = {
  findMemberInGym: jest.fn(),
  findMemberByUserId: jest.fn(),
  findExerciseById: jest.fn(),
} as unknown as jest.Mocked<LeaderboardRepository>;

const mockCache = { del: jest.fn() } as unknown as CacheService;

const staff: GymAuthUser = {
  sub: 'user-staff',
  type: 'gym',
  gymId: 'gym-1',
  roles: ['TRAINER'],
  permissions: ['leaderboard.review'],
};

const input = { exerciseId: 'ex-1', weightKg: 100, reps: 1, photoUrl: 'https://example.com/p.jpg' };

describe('SubmitPrUseCase — staff submission', () => {
  beforeEach(() => jest.resetAllMocks());

  it('rejects a target member that is not in this gym', async () => {
    mockRepo.findMemberInGym.mockResolvedValue(null);

    const uc = new SubmitPrUseCase(mockRepo, mockCache);
    await expect(
      uc.execute('gym-1', { ...input, targetMemberId: 'member-other-gym' }, staff),
    ).rejects.toMatchObject({ code: 'MEMBER_NOT_FOUND' });

    expect(mockRepo.findMemberInGym).toHaveBeenCalledWith('member-other-gym', 'gym-1');
    expect(mockRepo.findExerciseById).not.toHaveBeenCalled();
  });
});
