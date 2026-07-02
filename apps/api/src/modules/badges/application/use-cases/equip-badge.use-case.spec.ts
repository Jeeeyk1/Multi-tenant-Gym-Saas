import { EquipBadgeUseCase } from './equip-badge.use-case';
import type { BadgesRepository } from '../../infrastructure/persistence/badges.repository';
import type { AuthenticatedUser } from '../../../../common/types/auth.types';
import { ForbiddenError, NotFoundError } from '../../../../common/errors';

const mockRepo = {
  findMemberByUserId: jest.fn(),
  findMemberBadge: jest.fn(),
  setBadgeEquipped: jest.fn(),
} as unknown as jest.Mocked<BadgesRepository>;

const memberCaller: AuthenticatedUser = {
  type: 'gym',
  sub: 'user-1',
  gymId: 'gym-1',
  roles: ['MEMBER'],
  permissions: ['checkins.self'],
};

describe('EquipBadgeUseCase', () => {
  let useCase: EquipBadgeUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new EquipBadgeUseCase(mockRepo);
    mockRepo.findMemberByUserId.mockResolvedValue({ id: 'member-1' } as any);
    mockRepo.findMemberBadge.mockResolvedValue({
      id: 'badge-1',
      isEquipped: false,
      expiresAt: null,
    } as any);
  });

  it('equips the badge when equipped=true', async () => {
    await useCase.execute('gym-1', 'badge-1', true, memberCaller);
    expect(mockRepo.setBadgeEquipped).toHaveBeenCalledWith('badge-1', 'member-1', 'gym-1', true);
  });

  it('unequips the badge when equipped=false', async () => {
    await useCase.execute('gym-1', 'badge-1', false, memberCaller);
    expect(mockRepo.setBadgeEquipped).toHaveBeenCalledWith('badge-1', 'member-1', 'gym-1', false);
  });

  it('throws ForbiddenError when caller is in a different gym', async () => {
    await expect(useCase.execute('gym-2', 'badge-1', true, memberCaller)).rejects.toBeInstanceOf(
      ForbiddenError,
    );
    expect(mockRepo.setBadgeEquipped).not.toHaveBeenCalled();
  });

  it('throws NotFoundError when the caller has no member record', async () => {
    mockRepo.findMemberByUserId.mockResolvedValue(null);
    await expect(useCase.execute('gym-1', 'badge-1', true, memberCaller)).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });

  it('throws NotFoundError when the badge does not belong to the caller', async () => {
    mockRepo.findMemberBadge.mockResolvedValue(null);
    await expect(useCase.execute('gym-1', 'badge-1', true, memberCaller)).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });

  it('refuses to equip an expired badge', async () => {
    mockRepo.findMemberBadge.mockResolvedValue({
      id: 'badge-1',
      isEquipped: false,
      expiresAt: new Date('2020-01-01'),
    } as any);
    await expect(useCase.execute('gym-1', 'badge-1', true, memberCaller)).rejects.toBeInstanceOf(
      ForbiddenError,
    );
    expect(mockRepo.setBadgeEquipped).not.toHaveBeenCalled();
  });

  it('allows unequipping even if the badge has expired', async () => {
    mockRepo.findMemberBadge.mockResolvedValue({
      id: 'badge-1',
      isEquipped: true,
      expiresAt: new Date('2020-01-01'),
    } as any);
    await useCase.execute('gym-1', 'badge-1', false, memberCaller);
    expect(mockRepo.setBadgeEquipped).toHaveBeenCalledWith('badge-1', 'member-1', 'gym-1', false);
  });
});
