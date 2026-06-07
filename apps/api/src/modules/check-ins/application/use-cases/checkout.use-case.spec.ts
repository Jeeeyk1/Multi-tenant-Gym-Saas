import { CheckoutUseCase } from './checkout.use-case';
import type { CheckInsRepository } from '../../infrastructure/persistence/check-ins.repository';
import type { AuthenticatedUser } from '../../../../common/types/auth.types';

const mockRepo = {
  findCheckinById: jest.fn(),
  findMemberByUserId: jest.fn(),
  closeCheckin: jest.fn(),
} as unknown as jest.Mocked<CheckInsRepository>;

const staffCaller: AuthenticatedUser = {
  type: 'gym',
  sub: 'staff-1',
  gymId: 'gym-1',
  roles: ['MANAGER'],
  permissions: ['checkins.manage'],
};

const memberCaller: AuthenticatedUser = {
  type: 'gym',
  sub: 'member-user-1',
  gymId: 'gym-1',
  roles: ['MEMBER'],
  permissions: ['checkins.self'],
};

const openCheckin = { id: 'checkin-1', memberId: 'member-1', gymId: 'gym-1', checkedOutAt: null };
const closedCheckin = { ...openCheckin, checkedOutAt: new Date() };

describe('CheckoutUseCase', () => {
  let useCase: CheckoutUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new CheckoutUseCase(mockRepo);
    mockRepo.findCheckinById.mockResolvedValue(openCheckin as any);
    mockRepo.closeCheckin.mockResolvedValue({ id: 'checkin-1', checkedOutAt: new Date(), isAutoCheckout: false } as any);
  });

  it('staff with checkins.manage can check out any member', async () => {
    await useCase.execute('gym-1', 'checkin-1', staffCaller);
    expect(mockRepo.closeCheckin).toHaveBeenCalledWith('checkin-1', false);
  });

  it('member can check out their own active check-in', async () => {
    mockRepo.findMemberByUserId.mockResolvedValue({ id: 'member-1' } as any);
    await useCase.execute('gym-1', 'checkin-1', memberCaller);
    expect(mockRepo.closeCheckin).toHaveBeenCalledWith('checkin-1', false);
  });

  it('throws ConflictError when check-in is already closed', async () => {
    mockRepo.findCheckinById.mockResolvedValue(closedCheckin as any);
    await expect(useCase.execute('gym-1', 'checkin-1', staffCaller)).rejects.toMatchObject({
      code: 'ALREADY_CHECKED_OUT',
    });
  });

  it('throws NotFoundError when check-in does not exist in this gym', async () => {
    mockRepo.findCheckinById.mockResolvedValue(null);
    await expect(useCase.execute('gym-1', 'checkin-99', staffCaller)).rejects.toMatchObject({
      code: 'CHECKIN_NOT_FOUND',
    });
  });

  it('throws ForbiddenError when member tries to check out another member', async () => {
    mockRepo.findMemberByUserId.mockResolvedValue({ id: 'different-member' } as any);
    await expect(useCase.execute('gym-1', 'checkin-1', memberCaller)).rejects.toMatchObject({
      code: 'PERMISSION_DENIED',
    });
  });

  it('throws ForbiddenError when gym-level caller targets another gym', async () => {
    await expect(useCase.execute('gym-2', 'checkin-1', staffCaller)).rejects.toMatchObject({
      code: 'GYM_ACCESS_DENIED',
    });
  });
});
