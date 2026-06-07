import { RenewMembershipUseCase } from './renew-membership.use-case';
import type { RenewalsRepository } from '../../infrastructure/persistence/renewals.repository';
import type { AuthenticatedUser } from '../../../../common/types/auth.types';

const mockRepo = {
  findMemberForRenewal: jest.fn(),
  findPlanById: jest.fn(),
  processRenewal: jest.fn(),
} as unknown as jest.Mocked<RenewalsRepository>;

const staffCaller: AuthenticatedUser = {
  type: 'gym',
  sub: 'staff-1',
  gymId: 'gym-1',
  roles: ['FRONT_DESK'],
  permissions: ['members.renew', 'members.view'],
};

const plan = { id: 'plan-1', durationDays: 30 };

const expiredMember = {
  id: 'member-1',
  status: 'EXPIRED',
  expiryDate: new Date('2025-01-01'),
  membershipPlanId: 'plan-1',
};

const activeMember = {
  id: 'member-1',
  status: 'ACTIVE',
  expiryDate: new Date('2099-06-30'),
  membershipPlanId: 'plan-1',
};

const renewalResult = {
  id: 'renewal-1',
  previousExpiry: expiredMember.expiryDate,
  newExpiry: new Date(),
  amountPaid: 1500,
  paymentMethod: 'CASH',
  renewedAt: new Date(),
};

describe('RenewMembershipUseCase', () => {
  let useCase: RenewMembershipUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new RenewMembershipUseCase(mockRepo);
    mockRepo.findMemberForRenewal.mockResolvedValue(expiredMember as any);
    mockRepo.findPlanById.mockResolvedValue(plan as any);
    mockRepo.processRenewal.mockResolvedValue(renewalResult as any);
  });

  it('renews an expired member using the provided planId', async () => {
    await useCase.execute('gym-1', 'member-1', { planId: 'plan-1', amountPaid: 1500 }, staffCaller);
    expect(mockRepo.findPlanById).toHaveBeenCalledWith('plan-1', 'gym-1');
    expect(mockRepo.processRenewal).toHaveBeenCalledWith(
      expect.objectContaining({ memberId: 'member-1', amountPaid: 1500, renewedBy: 'staff-1' }),
    );
  });

  it('renews using the member existing plan when no planId is provided', async () => {
    await useCase.execute('gym-1', 'member-1', { amountPaid: 1500 }, staffCaller);
    expect(mockRepo.findPlanById).toHaveBeenCalledWith('plan-1', 'gym-1');
    expect(mockRepo.processRenewal).toHaveBeenCalled();
  });

  it('extends expiry from current expiryDate when member is still ACTIVE', async () => {
    mockRepo.findMemberForRenewal.mockResolvedValue(activeMember as any);
    await useCase.execute('gym-1', 'member-1', { amountPaid: 1500 }, staffCaller);

    const call = mockRepo.processRenewal.mock.calls[0][0];
    // new expiry must be after current expiry (2099-06-30 + 30 days)
    expect(call.newExpiry > activeMember.expiryDate).toBe(true);
  });

  it('resets expiry from today when member is EXPIRED', async () => {
    await useCase.execute('gym-1', 'member-1', { amountPaid: 1500 }, staffCaller);

    const call = mockRepo.processRenewal.mock.calls[0][0];
    // new expiry must be approximately today + 30 days (not 2025-01-01 + 30)
    const approxExpected = new Date();
    approxExpected.setDate(approxExpected.getDate() + 30);
    // within 1 day tolerance
    const diff = Math.abs(call.newExpiry.getTime() - approxExpected.getTime());
    expect(diff).toBeLessThan(24 * 60 * 60 * 1000);
  });

  it('throws NotFoundError when member not found', async () => {
    mockRepo.findMemberForRenewal.mockResolvedValue(null);
    await expect(
      useCase.execute('gym-1', 'member-99', { amountPaid: 1500 }, staffCaller),
    ).rejects.toMatchObject({ code: 'MEMBER_NOT_FOUND' });
  });

  it('throws NotFoundError when plan is not found or inactive', async () => {
    mockRepo.findPlanById.mockResolvedValue(null);
    await expect(
      useCase.execute('gym-1', 'member-1', { planId: 'bad-plan', amountPaid: 1500 }, staffCaller),
    ).rejects.toMatchObject({ code: 'PLAN_NOT_FOUND' });
  });

  it('throws ForbiddenError when caller lacks members.renew permission', async () => {
    const limited: AuthenticatedUser = { ...staffCaller, permissions: ['members.view'] };
    await expect(
      useCase.execute('gym-1', 'member-1', { amountPaid: 1500 }, limited),
    ).rejects.toMatchObject({ code: 'PERMISSION_DENIED' });
  });

  it('throws ForbiddenError when gym-level caller targets another gym', async () => {
    await expect(
      useCase.execute('gym-2', 'member-1', { amountPaid: 1500 }, staffCaller),
    ).rejects.toMatchObject({ code: 'GYM_ACCESS_DENIED' });
  });
});
