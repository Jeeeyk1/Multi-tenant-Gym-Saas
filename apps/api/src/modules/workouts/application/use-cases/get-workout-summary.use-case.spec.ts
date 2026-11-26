import { GetWorkoutSummaryUseCase } from './get-workout-summary.use-case';
import type { WorkoutsRepository } from '../../infrastructure/persistence/workouts.repository';
import type { AuthenticatedUser } from '../../../../common/types/auth.types';

const mockRepo = {
  findMemberByUserId: jest.fn(),
  summarizeSessions: jest.fn(),
} as unknown as jest.Mocked<WorkoutsRepository>;

const memberCaller: AuthenticatedUser = {
  type: 'gym',
  sub: 'member-user-1',
  gymId: 'gym-1',
  roles: ['MEMBER'],
  permissions: [],
};

describe('GetWorkoutSummaryUseCase', () => {
  let useCase: GetWorkoutSummaryUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new GetWorkoutSummaryUseCase(mockRepo);
  });

  it("returns the member's all-time totals", async () => {
    mockRepo.findMemberByUserId.mockResolvedValue({ id: 'member-1', status: 'ACTIVE' } as any);
    mockRepo.summarizeSessions.mockResolvedValue({ totalSessions: 54, totalMinutes: 2810, mostTrainedType: 'Strength' });

    await expect(useCase.execute('gym-1', memberCaller)).resolves.toEqual({
      totalSessions: 54,
      totalMinutes: 2810,
      mostTrainedType: 'Strength',
    });
    expect(mockRepo.findMemberByUserId).toHaveBeenCalledWith('gym-1', 'member-user-1');
    expect(mockRepo.summarizeSessions).toHaveBeenCalledWith('member-1');
  });

  it('rejects a token for another gym', async () => {
    await expect(useCase.execute('gym-2', memberCaller)).rejects.toBeDefined();
    expect(mockRepo.summarizeSessions).not.toHaveBeenCalled();
  });

  it('throws MEMBER_NOT_FOUND when the caller is not a member of the gym', async () => {
    mockRepo.findMemberByUserId.mockResolvedValue(null);

    await expect(useCase.execute('gym-1', memberCaller)).rejects.toMatchObject({ code: 'MEMBER_NOT_FOUND' });
  });
});
