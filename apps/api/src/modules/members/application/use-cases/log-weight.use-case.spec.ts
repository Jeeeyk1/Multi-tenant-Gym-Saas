import { LogWeightUseCase } from './log-weight.use-case';
import type { MembersRepository } from '../../infrastructure/persistence/members.repository';
import type { GymAuthUser } from '../../../../common/types/auth.types';

const mockRepo = {
  findMemberById: jest.fn(),
  logWeight: jest.fn(),
} as unknown as jest.Mocked<MembersRepository>;

function caller(sub: string, permissions: string[] = []): GymAuthUser {
  return { sub, type: 'gym', gymId: 'gym-1', roles: [], permissions };
}

const member = { id: 'member-1', gymId: 'gym-1', user: { id: 'user-owner' } };
const dto = { weightKg: 80 } as never;

describe('LogWeightUseCase', () => {
  let useCase: LogWeightUseCase;

  beforeEach(() => {
    jest.resetAllMocks();
    mockRepo.findMemberById.mockResolvedValue(member as never);
    useCase = new LogWeightUseCase(mockRepo);
  });

  it('lets a member log their own weight', async () => {
    await useCase.execute('gym-1', 'member-1', dto, caller('user-owner'));
    expect(mockRepo.logWeight).toHaveBeenCalledWith('member-1', 80, undefined);
  });

  it('rejects a member logging weight for someone else', async () => {
    await expect(
      useCase.execute('gym-1', 'member-1', dto, caller('user-other')),
    ).rejects.toMatchObject({ code: 'PERMISSION_DENIED' });
    expect(mockRepo.logWeight).not.toHaveBeenCalled();
  });

  it('lets staff with members.edit log weight for a member', async () => {
    await useCase.execute('gym-1', 'member-1', dto, caller('user-staff', ['members.edit']));
    expect(mockRepo.logWeight).toHaveBeenCalled();
  });

  it('rejects a caller from another gym', async () => {
    await expect(
      useCase.execute('gym-2', 'member-1', dto, caller('user-owner')),
    ).rejects.toMatchObject({ code: 'GYM_ACCESS_DENIED' });
  });
});
