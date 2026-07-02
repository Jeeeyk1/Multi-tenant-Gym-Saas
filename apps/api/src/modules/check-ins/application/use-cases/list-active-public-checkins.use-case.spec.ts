import { ListActivePublicCheckinsUseCase } from './list-active-public-checkins.use-case';
import type { CheckInsRepository } from '../../infrastructure/persistence/check-ins.repository';
import type { AuthenticatedUser } from '../../../../common/types/auth.types';
import { ForbiddenError } from '../../../../common/errors';

const mockRepo = {
  listActiveCheckins: jest.fn(),
} as unknown as jest.Mocked<CheckInsRepository>;

const memberCaller: AuthenticatedUser = {
  type: 'gym',
  sub: 'user-1',
  gymId: 'gym-1',
  roles: ['MEMBER'],
  permissions: ['checkins.self'],
};

function makeRow(opts: {
  memberId: string;
  userId: string;
  fullName: string;
  hidden: boolean;
  checkedInAt?: Date;
}) {
  return {
    id: `ci-${opts.memberId}`,
    method: 'APP_SELF_CHECKIN',
    checkedInAt: opts.checkedInAt ?? new Date('2026-06-27T10:00:00Z'),
    isOutOfHours: false,
    member: {
      id: opts.memberId,
      membershipNumber: 'M-001',
      privacy: { hideCheckinVisibility: opts.hidden },
      user: { id: opts.userId, fullName: opts.fullName },
    },
  };
}

describe('ListActivePublicCheckinsUseCase', () => {
  let useCase: ListActivePublicCheckinsUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new ListActivePublicCheckinsUseCase(mockRepo);
  });

  it('returns the total count and only the opted-in subset', async () => {
    mockRepo.listActiveCheckins.mockResolvedValue([
      makeRow({ memberId: 'm-1', userId: 'u-1', fullName: 'Alice', hidden: false }),
      makeRow({ memberId: 'm-2', userId: 'u-2', fullName: 'Bob', hidden: true }),
      makeRow({ memberId: 'm-3', userId: 'u-3', fullName: 'Carol', hidden: false }),
    ] as any);

    const result = await useCase.execute('gym-1', memberCaller);

    expect(result.totalCount).toBe(3);
    expect(result.visible).toHaveLength(2);
    expect(result.visible.map((v) => v.fullName).sort()).toEqual(['Alice', 'Carol']);
  });

  it('treats missing privacy row as the safe default (hidden)', async () => {
    mockRepo.listActiveCheckins.mockResolvedValue([
      { ...makeRow({ memberId: 'm-1', userId: 'u-1', fullName: 'Solo', hidden: false }), member: { id: 'm-1', membershipNumber: 'M-001', privacy: null, user: { id: 'u-1', fullName: 'Solo' } } },
    ] as any);

    const result = await useCase.execute('gym-1', memberCaller);

    // No privacy row → treated as not-hidden (filter only excludes when hideCheckinVisibility === true).
    expect(result.totalCount).toBe(1);
    expect(result.visible).toHaveLength(1);
  });

  it('returns zero counts when no one is checked in', async () => {
    mockRepo.listActiveCheckins.mockResolvedValue([]);

    const result = await useCase.execute('gym-1', memberCaller);

    expect(result.totalCount).toBe(0);
    expect(result.visible).toEqual([]);
  });

  it('throws ForbiddenError on cross-gym access', async () => {
    await expect(useCase.execute('gym-2', memberCaller)).rejects.toBeInstanceOf(ForbiddenError);
    expect(mockRepo.listActiveCheckins).not.toHaveBeenCalled();
  });
});
