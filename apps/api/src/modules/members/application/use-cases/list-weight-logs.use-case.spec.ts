import { ListWeightLogsUseCase } from './list-weight-logs.use-case';
import type { MembersRepository } from '../../infrastructure/persistence/members.repository';
import type { GymAuthUser } from '../../../../common/types/auth.types';

const mockRepo = {
  findMemberById: jest.fn(),
  listWeightLogs: jest.fn(),
} as unknown as jest.Mocked<MembersRepository>;

function caller(sub: string, permissions: string[] = []): GymAuthUser {
  return { sub, type: 'gym', gymId: 'gym-1', roles: [], permissions };
}

describe('ListWeightLogsUseCase', () => {
  let useCase: ListWeightLogsUseCase;

  beforeEach(() => {
    jest.resetAllMocks();
    mockRepo.findMemberById.mockResolvedValue({ id: 'member-1', user: { id: 'user-owner' } } as never);
    mockRepo.listWeightLogs.mockResolvedValue([]);
    useCase = new ListWeightLogsUseCase(mockRepo);
  });

  it('lets a member read their own history without staff permissions', async () => {
    await useCase.execute('gym-1', 'member-1', caller('user-owner'));
    expect(mockRepo.listWeightLogs).toHaveBeenCalledWith('member-1', 50);
  });

  it("refuses another member's history", async () => {
    await expect(useCase.execute('gym-1', 'member-1', caller('user-other'))).rejects.toMatchObject({
      code: 'PERMISSION_DENIED',
    });
  });

  it('lets staff with members.view read it', async () => {
    await useCase.execute('gym-1', 'member-1', caller('user-staff', ['members.view']));
    expect(mockRepo.listWeightLogs).toHaveBeenCalled();
  });

  it('rejects a caller from another gym', async () => {
    await expect(useCase.execute('gym-2', 'member-1', caller('user-owner'))).rejects.toMatchObject({
      code: 'GYM_ACCESS_DENIED',
    });
  });
});
