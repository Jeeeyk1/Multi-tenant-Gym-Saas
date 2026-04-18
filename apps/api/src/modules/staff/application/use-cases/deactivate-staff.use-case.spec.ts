import { DeactivateStaffUseCase } from './deactivate-staff.use-case';
import { ForbiddenError, NotFoundError } from '../../../../common/errors';
import type { StaffRepository } from '../../infrastructure/persistence/staff.repository';
import type { OrgAuthUser, GymAuthUser } from '../../../../common/types/auth.types';

const mockRepo = {
  findStaffById: jest.fn(),
  deactivate: jest.fn(),
} as unknown as StaffRepository;

const orgCaller: OrgAuthUser = {
  sub: 'user-org',
  type: 'org',
  organizationId: 'org-1',
  orgRole: 'OWNER',
};

const gymCaller: GymAuthUser = {
  sub: 'user-gym',
  type: 'gym',
  gymId: 'gym-1',
  roles: ['MANAGER'],
  permissions: ['staff.manage'],
};

const stubStaff = {
  id: 'staff-1',
  gymId: 'gym-1',
  userId: 'user-2',
  isActive: true,
  user: { id: 'user-2', email: 'staff@gym.com', fullName: 'Staff Member' },
  roles: [],
};

describe('DeactivateStaffUseCase', () => {
  let useCase: DeactivateStaffUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new DeactivateStaffUseCase(mockRepo);
  });

  it('deactivates a staff member', async () => {
    (mockRepo.findStaffById as jest.Mock).mockResolvedValue(stubStaff);
    (mockRepo.deactivate as jest.Mock).mockResolvedValue({ id: 'staff-1', isActive: false });

    const result = await useCase.execute('gym-1', 'staff-1', orgCaller);

    expect(result.isActive).toBe(false);
    expect(mockRepo.deactivate).toHaveBeenCalledWith('staff-1');
  });

  it('throws NotFoundError when staff does not belong to the gym', async () => {
    (mockRepo.findStaffById as jest.Mock).mockResolvedValue(null);

    await expect(useCase.execute('gym-1', 'staff-x', orgCaller)).rejects.toThrow(NotFoundError);
    expect(mockRepo.deactivate).not.toHaveBeenCalled();
  });

  it('throws ForbiddenError when gym-level caller lacks staff.manage permission', async () => {
    const noPermCaller: GymAuthUser = { ...gymCaller, permissions: [] };

    await expect(useCase.execute('gym-1', 'staff-1', noPermCaller)).rejects.toThrow(ForbiddenError);
    expect(mockRepo.findStaffById).not.toHaveBeenCalled();
  });

  it('throws ForbiddenError when gym-level caller targets a different gym', async () => {
    await expect(
      useCase.execute('gym-other', 'staff-1', gymCaller),
    ).rejects.toThrow(ForbiddenError);
  });
});
