import { UpdateMyPrivacyUseCase } from './update-my-privacy.use-case';
import type { MembersRepository } from '../../infrastructure/persistence/members.repository';
import type { AuthenticatedUser } from '../../../../common/types/auth.types';
import { ForbiddenError, NotFoundError } from '../../../../common/errors';

const mockRepo = {
  findFullMemberByUserId: jest.fn(),
  upsertMemberPrivacy: jest.fn(),
} as unknown as jest.Mocked<MembersRepository>;

const memberCaller: AuthenticatedUser = {
  type: 'gym',
  sub: 'user-1',
  gymId: 'gym-1',
  roles: ['MEMBER'],
  permissions: ['checkins.self'],
};

describe('UpdateMyPrivacyUseCase', () => {
  let useCase: UpdateMyPrivacyUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new UpdateMyPrivacyUseCase(mockRepo);
  });

  it('upserts privacy with the new flag when caller exists in this gym', async () => {
    mockRepo.findFullMemberByUserId.mockResolvedValue({ id: 'member-1' } as any);
    mockRepo.upsertMemberPrivacy.mockResolvedValue({
      hideCheckinVisibility: false,
      hideFromMemberList: false,
    } as any);

    const result = await useCase.execute('gym-1', { hideCheckinVisibility: false }, memberCaller);

    expect(mockRepo.upsertMemberPrivacy).toHaveBeenCalledWith('member-1', {
      hideCheckinVisibility: false,
    });
    expect(result.hideCheckinVisibility).toBe(false);
  });

  it('throws ForbiddenError on cross-gym access', async () => {
    await expect(useCase.execute('gym-2', { hideCheckinVisibility: true }, memberCaller)).rejects.toBeInstanceOf(
      ForbiddenError,
    );
    expect(mockRepo.findFullMemberByUserId).not.toHaveBeenCalled();
  });

  it('throws NotFoundError when caller has no member record in the gym', async () => {
    mockRepo.findFullMemberByUserId.mockResolvedValue(null);
    await expect(useCase.execute('gym-1', { hideCheckinVisibility: true }, memberCaller)).rejects.toBeInstanceOf(
      NotFoundError,
    );
    expect(mockRepo.upsertMemberPrivacy).not.toHaveBeenCalled();
  });
});
