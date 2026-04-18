import { InviteStaffUseCase } from './invite-staff.use-case';
import { ConflictError, ForbiddenError } from '../../../../common/errors';
import type { StaffRepository } from '../../infrastructure/persistence/staff.repository';
import type { OrgAuthUser, GymAuthUser } from '../../../../common/types/auth.types';

const mockRepo = {
  findUserByEmail: jest.fn(),
  findStaffByUserId: jest.fn(),
  inviteStaff: jest.fn(),
} as unknown as StaffRepository;

const orgCaller: OrgAuthUser = {
  sub: 'user-org',
  type: 'org',
  organizationId: 'org-1',
  orgRole: 'OWNER',
};

const gymCallerWithPermission: GymAuthUser = {
  sub: 'user-gym',
  type: 'gym',
  gymId: 'gym-1',
  roles: ['MANAGER'],
  permissions: ['staff.manage'],
};

const gymCallerWithoutPermission: GymAuthUser = {
  sub: 'user-gym-2',
  type: 'gym',
  gymId: 'gym-1',
  roles: ['TRAINER'],
  permissions: ['checkins.manage'],
};

const validInput = { email: 'newstaff@gym.com', fullName: 'New Staff' };

describe('InviteStaffUseCase', () => {
  let useCase: InviteStaffUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new InviteStaffUseCase(mockRepo);
  });

  it('invites a brand-new user (no existing account)', async () => {
    (mockRepo.findUserByEmail as jest.Mock).mockResolvedValue(null);
    (mockRepo.inviteStaff as jest.Mock).mockResolvedValue({
      staffId: 'staff-1',
      userId: 'user-new',
      inviteToken: 'tok-abc',
    });

    const result = await useCase.execute('gym-1', validInput, orgCaller);

    expect(result.inviteToken).toBe('tok-abc');
    expect(mockRepo.inviteStaff).toHaveBeenCalledWith(
      expect.objectContaining({ gymId: 'gym-1', email: validInput.email, existingUserId: undefined }),
    );
  });

  it('links an existing user account instead of creating a new one', async () => {
    (mockRepo.findUserByEmail as jest.Mock).mockResolvedValue({ id: 'user-existing', email: validInput.email, fullName: 'Existing', isActive: true });
    (mockRepo.findStaffByUserId as jest.Mock).mockResolvedValue(null);
    (mockRepo.inviteStaff as jest.Mock).mockResolvedValue({
      staffId: 'staff-2',
      userId: 'user-existing',
      inviteToken: 'tok-xyz',
    });

    const result = await useCase.execute('gym-1', validInput, orgCaller);

    expect(result.userId).toBe('user-existing');
    expect(mockRepo.inviteStaff).toHaveBeenCalledWith(
      expect.objectContaining({ existingUserId: 'user-existing' }),
    );
  });

  it('throws ConflictError when user is already staff at this gym', async () => {
    (mockRepo.findUserByEmail as jest.Mock).mockResolvedValue({ id: 'user-existing', email: validInput.email, fullName: 'Existing', isActive: true });
    (mockRepo.findStaffByUserId as jest.Mock).mockResolvedValue({ id: 'staff-existing', isActive: true });

    await expect(useCase.execute('gym-1', validInput, orgCaller)).rejects.toThrow(ConflictError);
    expect(mockRepo.inviteStaff).not.toHaveBeenCalled();
  });

  it('throws ForbiddenError when gym-level caller lacks staff.manage permission', async () => {
    await expect(
      useCase.execute('gym-1', validInput, gymCallerWithoutPermission),
    ).rejects.toThrow(ForbiddenError);
    expect(mockRepo.findUserByEmail).not.toHaveBeenCalled();
  });

  it('throws ForbiddenError when gym-level caller accesses a different gym', async () => {
    await expect(
      useCase.execute('gym-other', validInput, gymCallerWithPermission),
    ).rejects.toThrow(ForbiddenError);
  });

  it('succeeds when gym-level caller has staff.manage and targets their own gym', async () => {
    (mockRepo.findUserByEmail as jest.Mock).mockResolvedValue(null);
    (mockRepo.inviteStaff as jest.Mock).mockResolvedValue({
      staffId: 'staff-3',
      userId: 'user-new-2',
      inviteToken: 'tok-gym',
    });

    const result = await useCase.execute('gym-1', validInput, gymCallerWithPermission);

    expect(result.staffId).toBe('staff-3');
  });
});
