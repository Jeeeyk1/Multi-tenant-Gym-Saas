import { RegisterMemberUseCase } from './register-member.use-case';
import type { MembersRepository } from '../../infrastructure/persistence/members.repository';
import type { AuthenticatedUser } from '../../../../common/types/auth.types';

const mockRepo = {
  findUserByEmail: jest.fn(),
  findPlanById: jest.fn(),
  registerMember: jest.fn(),
} as unknown as jest.Mocked<MembersRepository>;

const gymCaller: AuthenticatedUser = {
  type: 'gym',
  sub: 'staff-1',
  gymId: 'gym-1',
  roles: ['FRONT_DESK'],
  permissions: ['members.create', 'members.view'],
};

const orgCaller: AuthenticatedUser = {
  type: 'org',
  sub: 'user-1',
  organizationId: 'org-1',
  orgRole: 'OWNER',
};

const plan = { id: 'plan-1', durationDays: 30 };
const registrationResult = {
  memberId: 'member-1',
  userId: 'user-new',
  membershipNumber: 'MBR-ABCD1234',
  inviteToken: 'tok-abc',
};

describe('RegisterMemberUseCase', () => {
  let useCase: RegisterMemberUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new RegisterMemberUseCase(mockRepo);
    mockRepo.findUserByEmail.mockResolvedValue(null);
    mockRepo.findPlanById.mockResolvedValue(plan as any);
    mockRepo.registerMember.mockResolvedValue(registrationResult);
  });

  it('registers a member with a plan (expiry computed from durationDays)', async () => {
    const result = await useCase.execute(
      'gym-1',
      { email: 'new@test.com', fullName: 'New User', planId: 'plan-1' },
      gymCaller,
    );
    expect(mockRepo.findPlanById).toHaveBeenCalledWith('plan-1', 'gym-1');
    expect(mockRepo.registerMember).toHaveBeenCalledWith(
      expect.objectContaining({ gymId: 'gym-1', planId: 'plan-1', email: 'new@test.com' }),
    );
    expect(result).toEqual(registrationResult);
  });

  it('registers a member with explicit expiryDate (no plan)', async () => {
    await useCase.execute(
      'gym-1',
      { email: 'new@test.com', fullName: 'New User', expiryDate: '2026-12-31' },
      gymCaller,
    );
    expect(mockRepo.findPlanById).not.toHaveBeenCalled();
    expect(mockRepo.registerMember).toHaveBeenCalledWith(
      expect.objectContaining({ expiryDate: new Date('2026-12-31') }),
    );
  });

  it('throws ConflictError when email is already taken', async () => {
    mockRepo.findUserByEmail.mockResolvedValue({ id: 'existing-user' } as any);
    await expect(
      useCase.execute('gym-1', { email: 'taken@test.com', fullName: 'User', planId: 'plan-1' }, gymCaller),
    ).rejects.toMatchObject({ code: 'EMAIL_TAKEN' });
  });

  it('throws NotFoundError when plan does not exist or belongs to another gym', async () => {
    mockRepo.findPlanById.mockResolvedValue(null);
    await expect(
      useCase.execute('gym-1', { email: 'new@test.com', fullName: 'User', planId: 'plan-99' }, gymCaller),
    ).rejects.toMatchObject({ code: 'PLAN_NOT_FOUND' });
  });

  it('throws ForbiddenError when neither planId nor expiryDate is provided', async () => {
    await expect(
      useCase.execute('gym-1', { email: 'new@test.com', fullName: 'User' }, gymCaller),
    ).rejects.toMatchObject({ code: 'MISSING_EXPIRY' });
  });

  it('throws ForbiddenError when gym-level caller targets another gym', async () => {
    await expect(
      useCase.execute('gym-2', { email: 'new@test.com', fullName: 'User', planId: 'plan-1' }, gymCaller),
    ).rejects.toMatchObject({ code: 'GYM_ACCESS_DENIED' });
  });

  it('throws ForbiddenError when caller lacks members.create permission', async () => {
    const limited: AuthenticatedUser = { ...gymCaller, permissions: ['members.view'] };
    await expect(
      useCase.execute('gym-1', { email: 'new@test.com', fullName: 'User', planId: 'plan-1' }, limited),
    ).rejects.toMatchObject({ code: 'PERMISSION_DENIED' });
  });

  it('allows org-level caller to register a member', async () => {
    await useCase.execute(
      'gym-1',
      { email: 'new@test.com', fullName: 'New User', planId: 'plan-1' },
      orgCaller,
    );
    expect(mockRepo.registerMember).toHaveBeenCalled();
  });
});
