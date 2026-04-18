import { AssignRoleUseCase } from './assign-role.use-case';
import { ConflictError, ForbiddenError, NotFoundError } from '../../../../common/errors';
import type { StaffRepository } from '../../infrastructure/persistence/staff.repository';
import type { OrgAuthUser, GymAuthUser } from '../../../../common/types/auth.types';

const mockRepo = {
  findStaffById: jest.fn(),
  findRoleById: jest.fn(),
  findStaffRoleAssignment: jest.fn(),
  assignRole: jest.fn(),
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
  roles: [],
};

const stubRole = { id: 'role-1', name: 'TRAINER' };

describe('AssignRoleUseCase', () => {
  let useCase: AssignRoleUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new AssignRoleUseCase(mockRepo);
  });

  it('assigns a role to a staff member', async () => {
    (mockRepo.findStaffById as jest.Mock).mockResolvedValue(stubStaff);
    (mockRepo.findRoleById as jest.Mock).mockResolvedValue(stubRole);
    (mockRepo.findStaffRoleAssignment as jest.Mock).mockResolvedValue(null);
    (mockRepo.assignRole as jest.Mock).mockResolvedValue({
      id: 'sr-1',
      roleId: 'role-1',
      assignedAt: new Date(),
    });

    const result = await useCase.execute('gym-1', 'staff-1', { roleId: 'role-1' }, orgCaller);

    expect(result.roleId).toBe('role-1');
    expect(mockRepo.assignRole).toHaveBeenCalledWith('staff-1', 'role-1', orgCaller.sub);
  });

  it('throws NotFoundError when staff does not exist in the gym', async () => {
    (mockRepo.findStaffById as jest.Mock).mockResolvedValue(null);

    await expect(
      useCase.execute('gym-1', 'staff-x', { roleId: 'role-1' }, orgCaller),
    ).rejects.toThrow(NotFoundError);
  });

  it('throws NotFoundError when role does not exist', async () => {
    (mockRepo.findStaffById as jest.Mock).mockResolvedValue(stubStaff);
    (mockRepo.findRoleById as jest.Mock).mockResolvedValue(null);

    await expect(
      useCase.execute('gym-1', 'staff-1', { roleId: 'role-nonexistent' }, orgCaller),
    ).rejects.toThrow(NotFoundError);
  });

  it('throws ConflictError when role is already assigned', async () => {
    (mockRepo.findStaffById as jest.Mock).mockResolvedValue(stubStaff);
    (mockRepo.findRoleById as jest.Mock).mockResolvedValue(stubRole);
    (mockRepo.findStaffRoleAssignment as jest.Mock).mockResolvedValue({ id: 'sr-existing' });

    await expect(
      useCase.execute('gym-1', 'staff-1', { roleId: 'role-1' }, orgCaller),
    ).rejects.toThrow(ConflictError);
    expect(mockRepo.assignRole).not.toHaveBeenCalled();
  });

  it('throws ForbiddenError when gym-level caller lacks staff.manage permission', async () => {
    const noPermCaller: GymAuthUser = { ...gymCaller, permissions: [] };

    await expect(
      useCase.execute('gym-1', 'staff-1', { roleId: 'role-1' }, noPermCaller),
    ).rejects.toThrow(ForbiddenError);
  });

  it('throws ForbiddenError when gym-level caller targets a different gym', async () => {
    await expect(
      useCase.execute('gym-other', 'staff-1', { roleId: 'role-1' }, gymCaller),
    ).rejects.toThrow(ForbiddenError);
  });
});
