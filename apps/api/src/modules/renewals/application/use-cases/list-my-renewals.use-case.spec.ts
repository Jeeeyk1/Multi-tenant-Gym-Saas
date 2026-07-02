import { ListMyRenewalsUseCase } from './list-my-renewals.use-case';
import type { RenewalsRepository } from '../../infrastructure/persistence/renewals.repository';
import type { AuthenticatedUser } from '../../../../common/types/auth.types';
import { ForbiddenError, NotFoundError } from '../../../../common/errors';

const mockRepo = {
  findMemberForRenewal: jest.fn(),
  findMemberByUserId: jest.fn(),
  findPlanById: jest.fn(),
  processRenewal: jest.fn(),
  listRenewals: jest.fn(),
  listGymRenewals: jest.fn(),
} as unknown as jest.Mocked<RenewalsRepository>;

const memberCaller: AuthenticatedUser = {
  type: 'gym',
  sub: 'user-1',
  gymId: 'gym-1',
  roles: ['MEMBER'],
  permissions: ['checkins.self', 'announcements.view'],
};

describe('ListMyRenewalsUseCase', () => {
  let useCase: ListMyRenewalsUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new ListMyRenewalsUseCase(mockRepo);
  });

  it('returns the renewal history for the calling member', async () => {
    mockRepo.findMemberByUserId.mockResolvedValue({ id: 'member-1' } as any);
    mockRepo.listRenewals.mockResolvedValue([{ id: 'renewal-1' }] as any);

    const result = await useCase.execute('gym-1', memberCaller);

    expect(mockRepo.findMemberByUserId).toHaveBeenCalledWith('user-1', 'gym-1');
    expect(mockRepo.listRenewals).toHaveBeenCalledWith('member-1');
    expect(result).toEqual([{ id: 'renewal-1' }]);
  });

  it('throws ForbiddenError when caller is on a different gym', async () => {
    await expect(
      useCase.execute('gym-2', memberCaller),
    ).rejects.toBeInstanceOf(ForbiddenError);
    expect(mockRepo.findMemberByUserId).not.toHaveBeenCalled();
  });

  it('throws NotFoundError when caller has no member record in this gym', async () => {
    mockRepo.findMemberByUserId.mockResolvedValue(null);

    await expect(
      useCase.execute('gym-1', memberCaller),
    ).rejects.toBeInstanceOf(NotFoundError);
    expect(mockRepo.listRenewals).not.toHaveBeenCalled();
  });
});
