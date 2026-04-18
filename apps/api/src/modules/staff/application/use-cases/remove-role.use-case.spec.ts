import { RemoveRoleUseCase } from './remove-role.use-case';
import { ForbiddenError, NotFoundError } from '../../../../common/errors';
import type { StaffRepository } from '../../infrastructure/persistence/staff.repository';
import type { OrgAuthUser, GymAuthUser } from '../../../../common/types/auth.types';

const mockRepo = {
  findStaffById: jest.fn(),
  findStaffRoleAssignment: jest.fn(),
  removeRole: jest.fn(),
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
  user: { id: 'user-2', email: 'staff@gym.com', fullName: 'Staff' },
  roles: [{ id: 'sr-1', roleId: 'role-1', role: { id: 'role-1', name: 'TRAINER' } }],
};

describe('RemoveRoleUseCase', () => {
  let useCase: RemoveRoleUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new RemoveRoleUseCase(mockRepo);
  });

  it('removes a role assignment from a staff member', async () => {
    (mockRepo.findStaffById as jest.Mock).mockResolvedValue(stubStaff);
    (mockRepo.findStaffRoleAssignment as jest.Mock).mockResolvedValue({ id: 'sr-1' });
    (mockRepo.removeRole as jest.Mock).mockResolvedValue(undefined);

    await useCase.execute('gym-1', 'staff-1', 'role-1', orgCaller);

    expect(mockRepo.removeRole).toHaveBeenCalledWith('staff-1', 'role-1');
  });

  it('throws NotFoundError when staff does not exist in the gym', async () => {
    (mockRepo.findStaffById as jest.Mock).mockResolvedValue(null);

    await expect(
      useCase.execute('gym-1', 'staff-x', 'role-1', orgCaller),
    ).rejects.toThrow(NotFoundError);
    expect(mockRepo.removeRole).not.toHaveBeenCalled();
  });

  it('throws NotFoundError when role is not assigned to this staff member', async () => {
    (mockRepo.findStaffById as jest.Mock).mockResolvedValue(stubStaff);
    (mockRepo.findStaffRoleAssignment as jest.Mock).mockResolvedValue(null);

    await expect(
      useCase.execute('gym-1', 'staff-1', 'role-nonexistent', orgCaller),
    ).rejects.toThrow(NotFoundError);
    expect(mockRepo.removeRole).not.toHaveBeenCalled();
  });

  it('throws ForbiddenError when gym-level caller lacks staff.manage permission', async () => {
    const noPermCaller: GymAuthUser = { ...gymCaller, permissions: [] };

    await expect(
      useCase.execute('gym-1', 'staff-1', 'role-1', noPermCaller),
    ).rejects.toThrow(ForbiddenError);
  });

  it('throws ForbiddenError when gym-level caller targets a different gym', async () => {
    await expect(
      useCase.execute('gym-other', 'staff-1', 'role-1', gymCaller),
    ).rejects.toThrow(ForbiddenError);
  });
});
