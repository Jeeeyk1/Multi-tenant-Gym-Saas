import { ReactivateMemberUseCase } from './reactivate-member.use-case';
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
  permissions: ['members.edit'],
};

const suspendedMember = { id: 'member-1', gymId: 'gym-1', status: 'SUSPENDED', user: { id: 'user-1' } };
const activeMember = { ...suspendedMember, status: 'ACTIVE' };

describe('ReactivateMemberUseCase', () => {
  let useCase: ReactivateMemberUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new ReactivateMemberUseCase(mockRepo);
    mockRepo.findMemberById.mockResolvedValue(suspendedMember as any);
    mockRepo.updateStatus.mockResolvedValue({ id: 'member-1', status: 'ACTIVE' } as any);
  });

  it('reactivates a suspended member', async () => {
    await useCase.execute('gym-1', 'member-1', gymCaller);
    expect(mockRepo.updateStatus).toHaveBeenCalledWith('member-1', 'ACTIVE');
  });

  it('reactivates an expired member', async () => {
    mockRepo.findMemberById.mockResolvedValue({ ...suspendedMember, status: 'EXPIRED' } as any);
    await useCase.execute('gym-1', 'member-1', gymCaller);
    expect(mockRepo.updateStatus).toHaveBeenCalledWith('member-1', 'ACTIVE');
  });

  it('throws NotFoundError when member not found', async () => {
    mockRepo.findMemberById.mockResolvedValue(null);
    await expect(useCase.execute('gym-1', 'member-99', gymCaller)).rejects.toMatchObject({
      code: 'MEMBER_NOT_FOUND',
    });
  });

  it('throws ConflictError when member is already active', async () => {
    mockRepo.findMemberById.mockResolvedValue(activeMember as any);
    await expect(useCase.execute('gym-1', 'member-1', gymCaller)).rejects.toMatchObject({
      code: 'ALREADY_ACTIVE',
    });
  });

  it('throws ForbiddenError when caller lacks members.edit permission', async () => {
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
