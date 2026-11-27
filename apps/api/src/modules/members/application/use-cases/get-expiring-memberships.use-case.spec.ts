import { GetExpiringMembershipsUseCase } from './get-expiring-memberships.use-case';
import type { MembersRepository } from '../../infrastructure/persistence/members.repository';
import type { AuthenticatedUser } from '../../../../common/types/auth.types';

const mockRepo = {
  getGymTimezone: jest.fn(),
  countActiveExpiringBetween: jest.fn(),
  countExpiredMembers: jest.fn(),
  listActiveExpiringBetween: jest.fn(),
} as unknown as jest.Mocked<MembersRepository>;

const staff: AuthenticatedUser = {
  type: 'gym',
  sub: 'staff-1',
  gymId: 'gym-1',
  roles: ['STAFF'],
  permissions: ['members.renew'],
};

// 30 Nov 2026, 23:30 UTC is already 1 Dec in Manila (UTC+8).
const NOW = new Date('2026-11-30T23:30:00Z');

describe('GetExpiringMembershipsUseCase', () => {
  let useCase: GetExpiringMembershipsUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new GetExpiringMembershipsUseCase(mockRepo);
    mockRepo.getGymTimezone.mockResolvedValue('Asia/Manila');
    mockRepo.countActiveExpiringBetween.mockResolvedValue(9);
    mockRepo.countExpiredMembers.mockResolvedValue(3);
    mockRepo.listActiveExpiringBetween.mockResolvedValue([
      { id: 'm-1', membershipNumber: 'MBR-1', expiryDate: new Date('2026-12-01T00:00:00Z'), user: { fullName: 'Jo Lim' } },
    ] as any);
  });

  it("uses the gym's local today and a 7-day window by default", async () => {
    const result = await useCase.execute('gym-1', undefined, staff, NOW);

    expect(mockRepo.countActiveExpiringBetween).toHaveBeenCalledWith('gym-1', '2026-12-01', '2026-12-07');
    expect(mockRepo.listActiveExpiringBetween).toHaveBeenCalledWith('gym-1', '2026-12-01', '2026-12-07', 5);
    expect(result).toEqual({
      days: 7,
      from: '2026-12-01',
      to: '2026-12-07',
      expiringSoon: 9,
      expired: 3,
      soonest: [{ id: 'm-1', fullName: 'Jo Lim', membershipNumber: 'MBR-1', expiryDate: '2026-12-01' }],
    });
  });

  it('honours a custom window, today included', async () => {
    await useCase.execute('gym-1', 1, staff, NOW);
    expect(mockRepo.countActiveExpiringBetween).toHaveBeenCalledWith('gym-1', '2026-12-01', '2026-12-01');
  });

  it('requires members.renew', async () => {
    await expect(useCase.execute('gym-1', 7, { ...staff, permissions: ['members.view'] }, NOW)).rejects.toMatchObject({
      code: 'PERMISSION_DENIED',
    });
  });

  it('rejects a token for another gym', async () => {
    await expect(useCase.execute('gym-2', 7, staff, NOW)).rejects.toBeDefined();
    expect(mockRepo.countActiveExpiringBetween).not.toHaveBeenCalled();
  });
});
