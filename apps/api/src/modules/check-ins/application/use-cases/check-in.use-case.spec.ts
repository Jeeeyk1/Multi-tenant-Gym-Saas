import { CheckInUseCase } from './check-in.use-case';
import type { CheckInsRepository } from '../../infrastructure/persistence/check-ins.repository';
import type { AuthenticatedUser } from '../../../../common/types/auth.types';

const mockRepo = {
  findGymForCheckin: jest.fn(),
  findMemberForCheckin: jest.fn(),
  findMemberByUserId: jest.fn(),
  findMemberByQrToken: jest.fn(),
  findActiveCheckin: jest.fn(),
  createCheckin: jest.fn(),
  closeCheckin: jest.fn(),
} as unknown as jest.Mocked<CheckInsRepository>;

const staffCaller: AuthenticatedUser = {
  type: 'gym',
  sub: 'staff-user-1',
  gymId: 'gym-1',
  roles: ['FRONT_DESK'],
  permissions: ['checkins.manage'],
};

const memberCaller: AuthenticatedUser = {
  type: 'gym',
  sub: 'member-user-1',
  gymId: 'gym-1',
  roles: ['MEMBER'],
  permissions: ['checkins.self', 'announcements.view'],
};

const gym = {
  id: 'gym-1',
  status: 'ACTIVE',
  timezone: 'Asia/Manila',
  is247: true, // use 24/7 to avoid timezone complexity in tests
  autoCheckoutHours: 5,
  schedules: [],
};

const activeMember = {
  id: 'member-1',
  gymId: 'gym-1',
  status: 'ACTIVE',
  expiryDate: new Date('2099-12-31'),
};

const newCheckin = { id: 'checkin-1', memberId: 'member-1', gymId: 'gym-1', method: 'MANUAL_STAFF' };

describe('CheckInUseCase', () => {
  let useCase: CheckInUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new CheckInUseCase(mockRepo);
    mockRepo.findGymForCheckin.mockResolvedValue(gym as any);
    mockRepo.findMemberForCheckin.mockResolvedValue(activeMember as any);
    mockRepo.findMemberByUserId.mockResolvedValue(activeMember as any);
    mockRepo.findMemberByQrToken.mockResolvedValue(activeMember as any);
    mockRepo.findActiveCheckin.mockResolvedValue(null);
    mockRepo.createCheckin.mockResolvedValue(newCheckin as any);
  });

  it('creates a MANUAL_STAFF check-in with processedBy set', async () => {
    await useCase.execute('gym-1', { method: 'MANUAL_STAFF', memberId: 'member-1' }, staffCaller);
    expect(mockRepo.findMemberForCheckin).toHaveBeenCalledWith('member-1', 'gym-1');
    expect(mockRepo.createCheckin).toHaveBeenCalledWith(
      expect.objectContaining({ method: 'MANUAL_STAFF', processedBy: 'staff-user-1' }),
    );
  });

  it('creates a QR_STAFF_SCAN check-in resolved by qrCodeToken', async () => {
    await useCase.execute('gym-1', { method: 'QR_STAFF_SCAN', qrCodeToken: 'tok-abc' }, staffCaller);
    expect(mockRepo.findMemberByQrToken).toHaveBeenCalledWith('tok-abc', 'gym-1');
    expect(mockRepo.createCheckin).toHaveBeenCalledWith(
      expect.objectContaining({ method: 'QR_STAFF_SCAN', processedBy: 'staff-user-1' }),
    );
  });

  it('creates an APP_SELF_CHECKIN with null processedBy', async () => {
    await useCase.execute('gym-1', { method: 'APP_SELF_CHECKIN' }, memberCaller);
    expect(mockRepo.findMemberByUserId).toHaveBeenCalledWith('member-user-1', 'gym-1');
    expect(mockRepo.createCheckin).toHaveBeenCalledWith(
      expect.objectContaining({ method: 'APP_SELF_CHECKIN', processedBy: null }),
    );
  });

  it('auto-closes a stale open check-in before creating a new one', async () => {
    const staleCheckin = { id: 'old-checkin', checkedInAt: new Date(Date.now() - 6 * 60 * 60 * 1000) };
    mockRepo.findActiveCheckin.mockResolvedValue(staleCheckin as any);

    await useCase.execute('gym-1', { method: 'MANUAL_STAFF', memberId: 'member-1' }, staffCaller);

    expect(mockRepo.closeCheckin).toHaveBeenCalledWith('old-checkin', true);
    expect(mockRepo.createCheckin).toHaveBeenCalled();
  });

  it('throws ConflictError when member has a fresh active check-in', async () => {
    const freshCheckin = { id: 'open-checkin', checkedInAt: new Date() };
    mockRepo.findActiveCheckin.mockResolvedValue(freshCheckin as any);

    await expect(
      useCase.execute('gym-1', { method: 'MANUAL_STAFF', memberId: 'member-1' }, staffCaller),
    ).rejects.toMatchObject({ code: 'ALREADY_CHECKED_IN' });
  });

  it('throws ForbiddenError when member status is not ACTIVE', async () => {
    mockRepo.findMemberForCheckin.mockResolvedValue({ ...activeMember, status: 'SUSPENDED' } as any);
    await expect(
      useCase.execute('gym-1', { method: 'MANUAL_STAFF', memberId: 'member-1' }, staffCaller),
    ).rejects.toMatchObject({ code: 'MEMBER_NOT_ACTIVE' });
  });

  it('throws ForbiddenError when membership is expired', async () => {
    mockRepo.findMemberForCheckin.mockResolvedValue({
      ...activeMember,
      expiryDate: new Date('2020-01-01'),
    } as any);
    await expect(
      useCase.execute('gym-1', { method: 'MANUAL_STAFF', memberId: 'member-1' }, staffCaller),
    ).rejects.toMatchObject({ code: 'MEMBERSHIP_EXPIRED' });
  });

  it('throws ForbiddenError when staff caller lacks checkins.manage', async () => {
    const limited: AuthenticatedUser = { ...staffCaller, permissions: ['checkins.view'] };
    await expect(
      useCase.execute('gym-1', { method: 'MANUAL_STAFF', memberId: 'member-1' }, limited),
    ).rejects.toMatchObject({ code: 'PERMISSION_DENIED' });
  });

  it('throws ForbiddenError when gym-level caller targets another gym', async () => {
    await expect(
      useCase.execute('gym-2', { method: 'APP_SELF_CHECKIN' }, memberCaller),
    ).rejects.toMatchObject({ code: 'GYM_ACCESS_DENIED' });
  });
});
