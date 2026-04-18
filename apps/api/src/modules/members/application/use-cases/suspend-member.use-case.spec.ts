import { SuspendMemberUseCase } from './suspend-member.use-case';
import type { MembersRepository } from '../../infrastructure/persistence/members.repository';
import type { AuthenticatedUser } from '../../../../common/types/auth.types';

const mockRepo = {
  findMemberById: jest.fn(),
  updateStatus: jest.fn(),
} as unknown as jest.Mocked<MembersRepository>;

const gymCaller: AuthenticatedUser = {
  type: 'gym',
  sub: 'staff-1',
  gymId: 'gym-1',
  roles: ['MANAGER'],
  permissions: ['members.suspend'],
};

const activeMember = { id: 'member-1', gymId: 'gym-1', status: 'ACTIVE', user: { id: 'user-1' } };
const suspendedMember = { ...activeMember, status: 'SUSPENDED' };

describe('SuspendMemberUseCase', () => {
  let useCase: SuspendMemberUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new SuspendMemberUseCase(mockRepo);
    mockRepo.findMemberById.mockResolvedValue(activeMember as any);
    mockRepo.updateStatus.mockResolvedValue({ id: 'member-1', status: 'SUSPENDED' } as any);
  });

  it('suspends an active member', async () => {
    await useCase.execute('gym-1', 'member-1', gymCaller);
    expect(mockRepo.updateStatus).toHaveBeenCalledWith('member-1', 'SUSPENDED');
  });

  it('throws NotFoundError when member not found', async () => {
    mockRepo.findMemberById.mockResolvedValue(null);
    await expect(useCase.execute('gym-1', 'member-99', gymCaller)).rejects.toMatchObject({
      code: 'MEMBER_NOT_FOUND',
    });
  });

  it('throws ConflictError when member is already suspended', async () => {
    mockRepo.findMemberById.mockResolvedValue(suspendedMember as any);
    await expect(useCase.execute('gym-1', 'member-1', gymCaller)).rejects.toMatchObject({
      code: 'ALREADY_SUSPENDED',
    });
  });

  it('throws ForbiddenError when caller lacks members.suspend permission', async () => {
    const limited: AuthenticatedUser = { ...gymCaller, permissions: ['members.view'] };
    await expect(useCase.execute('gym-1', 'member-1', limited)).rejects.toMatchObject({
      code: 'PERMISSION_DENIED',
    });
  });

  it('throws ForbiddenError when gym-level caller targets another gym', async () => {
    await expect(useCase.execute('gym-2', 'member-1', gymCaller)).rejects.toMatchObject({
      code: 'GYM_ACCESS_DENIED',
    });
  });
});
