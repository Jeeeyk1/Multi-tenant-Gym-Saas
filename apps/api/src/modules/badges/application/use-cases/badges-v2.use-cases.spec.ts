import { CheckAutoBadgesUseCase } from './check-auto-badges.use-case';
import { CheckMilestoneBadgeUseCase } from './check-milestone-badge.use-case';
import { AwardCustomBadgeUseCase } from './award-custom-badge.use-case';
import { SaveLadderUseCase } from './save-ladder.use-case';
import { GetBadgeCollectionUseCase } from './get-badge-collection.use-case';
import type { BadgesRepository } from '../../infrastructure/persistence/badges.repository';
import type { BadgeNotifier } from '../badge-notifier';
import type { LadderService } from '../ladder.service';
import type { CacheService } from '../../../../common/cache/cache.service';
import type { GymAuthUser } from '../../../../common/types/auth.types';
import { BadgeCategory, BadgeCriteriaType } from '../../../../common/enums';

const repo = {
  getEnabledBadgeCatalog: jest.fn(),
  listOwnedCatalogBadgeIds: jest.fn(),
  isLeaderboardLift: jest.fn(),
  listCatalogForGym: jest.fn(),
  awardCatalogBadge: jest.fn(),
  awardMilestoneBadge: jest.fn(),
  awardCustomBadge: jest.fn(),
  getMilestoneBadgesForExercise: jest.fn(),
  listMilestoneBadges: jest.fn(),
  listMilestoneBadgesForCollection: jest.fn(),
  listCustomBadgesForCollection: jest.fn(),
  listCustomBadges: jest.fn(),
  listMemberBadges: jest.fn(),
  findCustomBadge: jest.fn(),
  findMemberInGym: jest.fn(),
  findMemberByUserId: jest.fn(),
  findExerciseForGym: jest.fn(),
  saveLadder: jest.fn(),
  disableLadder: jest.fn(),
  awardRungForExistingLifts: jest.fn(),
  getBestApprovedLifts: jest.fn(),
  getBadgeHolderCounts: jest.fn(),
  getGymTimezone: jest.fn(),
  getSessionCount: jest.fn(),
  getDistinctWorkoutTypeCount: jest.fn(),
  getCheckinTimestamps: jest.fn(),
  getSessionDates: jest.fn(),
  getMembershipHistory: jest.fn(),
  getMemberJoinPosition: jest.fn(),
} as unknown as jest.Mocked<BadgesRepository>;
const notifier = { notify: jest.fn() } as unknown as jest.Mocked<BadgeNotifier>;
const ladders = { ensureDefaultLadders: jest.fn(), ensureDefaultLaddersCached: jest.fn() } as unknown as jest.Mocked<LadderService>;
const cache = { wrap: jest.fn((_k: string, _t: number, fn: () => unknown) => fn()) } as unknown as jest.Mocked<CacheService>;

const staff = (permissions: string[]): GymAuthUser => ({ sub: 'staff-1', type: 'gym', gymId: 'gym-1', roles: [], permissions });
const memberCaller: GymAuthUser = { sub: 'user-1', type: 'gym', gymId: 'gym-1', roles: ['MEMBER'], permissions: [] };

function quietStats() {
  repo.getGymTimezone.mockResolvedValue('Asia/Manila');
  repo.getSessionCount.mockResolvedValue(5);
  repo.getDistinctWorkoutTypeCount.mockResolvedValue(1);
  repo.getCheckinTimestamps.mockResolvedValue([]);
  repo.getSessionDates.mockResolvedValue([]);
  repo.getMembershipHistory.mockResolvedValue(null);
  repo.getMemberJoinPosition.mockResolvedValue(50);
}

beforeEach(() => jest.clearAllMocks());

describe('CheckAutoBadgesUseCase', () => {
  it('awards badges the member qualifies for and notifies only for new ones', async () => {
    quietStats();
    repo.getEnabledBadgeCatalog.mockResolvedValue([
      { id: 'b1', key: 'FIRST_STEP', name: 'First Step', category: 'CONSISTENCY', criteriaType: BadgeCriteriaType.SESSION_COUNT, criteriaValue: 1, isAutoAwarded: true },
      { id: 'b5', key: 'SESSIONS_5', name: 'Getting Started', category: 'CONSISTENCY', criteriaType: BadgeCriteriaType.SESSION_COUNT, criteriaValue: 5, isAutoAwarded: true },
      { id: 'b10', key: 'SESSIONS_10', name: 'Getting Serious', category: 'CONSISTENCY', criteriaType: BadgeCriteriaType.SESSION_COUNT, criteriaValue: 10, isAutoAwarded: true },
    ] as never);
    // b1 is already held, so it is skipped; b5 is reached; b10 isn't.
    repo.listOwnedCatalogBadgeIds.mockResolvedValue(new Set(['b1']));
    repo.awardCatalogBadge.mockResolvedValue(true);

    await new CheckAutoBadgesUseCase(repo, notifier).execute('member-1', 'gym-1');

    expect(repo.awardCatalogBadge).toHaveBeenCalledTimes(1);
    expect(notifier.notify).toHaveBeenCalledWith('member-1', ['Getting Started']);
  });

  it("doesn't notify when another request awarded the badge first", async () => {
    quietStats();
    repo.getEnabledBadgeCatalog.mockResolvedValue([
      { id: 'b5', key: 'SESSIONS_5', name: 'Getting Started', category: 'CONSISTENCY', criteriaType: BadgeCriteriaType.SESSION_COUNT, criteriaValue: 5, isAutoAwarded: true },
    ] as never);
    repo.listOwnedCatalogBadgeIds.mockResolvedValue(new Set());
    repo.awardCatalogBadge.mockResolvedValue(false);

    await new CheckAutoBadgesUseCase(repo, notifier).execute('member-1', 'gym-1');
    expect(notifier.notify).not.toHaveBeenCalled();
  });

  it('skips loading stats when the member already holds every auto badge', async () => {
    repo.getEnabledBadgeCatalog.mockResolvedValue([{ id: 'b1', key: 'FIRST_STEP', isAutoAwarded: true }] as never);
    repo.listOwnedCatalogBadgeIds.mockResolvedValue(new Set(['b1']));

    await new CheckAutoBadgesUseCase(repo, notifier).execute('member-1', 'gym-1');

    expect(repo.getSessionCount).not.toHaveBeenCalled();
    expect(repo.awardCatalogBadge).not.toHaveBeenCalled();
    expect(notifier.notify).not.toHaveBeenCalled();
  });
});

describe('CheckMilestoneBadgeUseCase', () => {
  it('awards every rung a heavy lift reaches at once', async () => {
    repo.getMilestoneBadgesForExercise.mockResolvedValue([
      { id: 'bronze', badgeName: 'Back Squat · Bronze', weightKg: '60' },
      { id: 'silver', badgeName: 'Back Squat · Silver', weightKg: '80' },
      { id: 'gold', badgeName: 'Back Squat · Gold', weightKg: '100' },
    ] as never);
    repo.awardMilestoneBadge.mockResolvedValue(true);

    await new CheckMilestoneBadgeUseCase(repo, notifier).execute('member-1', 'gym-1', 'squat', 85);

    expect(repo.awardMilestoneBadge.mock.calls.map((c) => c[2])).toEqual(['bronze', 'silver']);
    expect(notifier.notify).toHaveBeenCalledWith('member-1', ['Back Squat · Bronze', 'Back Squat · Silver']);
  });
});

describe('AwardCustomBadgeUseCase', () => {
  it("rejects a badge that isn't this gym's", async () => {
    repo.findMemberInGym.mockResolvedValue({ id: 'member-1' } as never);
    repo.findCustomBadge.mockResolvedValue(null);
    await expect(
      new AwardCustomBadgeUseCase(repo, notifier).execute(
        'gym-1',
        { memberId: 'member-1', customBadgeId: 'other-gym-badge' },
        staff(['badges.award']),
      ),
    ).rejects.toMatchObject({ code: 'BADGE_NOT_FOUND' });
    expect(repo.awardCustomBadge).not.toHaveBeenCalled();
  });

  it("awards it in the badge's own category and notifies the member", async () => {
    repo.findMemberInGym.mockResolvedValue({ id: 'member-1' } as never);
    repo.findCustomBadge.mockResolvedValue({ id: 'motm', name: 'Member of the Month', category: 'LOYALTY' } as never);
    await new AwardCustomBadgeUseCase(repo, notifier).execute(
      'gym-1',
      { memberId: 'member-1', customBadgeId: 'motm' },
      staff(['badges.award']),
    );
    expect(repo.awardCustomBadge).toHaveBeenCalledWith('member-1', 'gym-1', expect.objectContaining({ category: 'LOYALTY' }), 'staff-1', undefined, undefined);
    expect(notifier.notify).toHaveBeenCalledWith('member-1', ['Member of the Month']);
  });
});

describe('SaveLadderUseCase', () => {
  beforeEach(() => {
    repo.findExerciseForGym.mockResolvedValue({ id: 'squat', name: 'Back Squat', category: 'LEGS' } as never);
    repo.isLeaderboardLift.mockResolvedValue(true);
    repo.awardRungForExistingLifts.mockResolvedValue(0);
  });

  it('only gives leaderboard lifts a ladder', async () => {
    repo.isLeaderboardLift.mockResolvedValue(false);
    await expect(
      new SaveLadderUseCase(repo).execute('gym-1', 'squat', { enabled: true, weights: { BRONZE: 50, SILVER: 70, GOLD: 90 } }, staff(['leaderboard.manage'])),
    ).rejects.toMatchObject({ code: 'NOT_A_LEADERBOARD_LIFT' });
    expect(repo.saveLadder).not.toHaveBeenCalled();
  });

  it('requires weights that go up from bronze to gold', async () => {
    await expect(
      new SaveLadderUseCase(repo).execute('gym-1', 'squat', { enabled: true, weights: { BRONZE: 80, SILVER: 60, GOLD: 100 } }, staff(['leaderboard.manage'])),
    ).rejects.toMatchObject({ code: 'INVALID_LADDER' });
  });

  it('saves the rungs and credits lifts that already reach them', async () => {
    repo.saveLadder.mockResolvedValue([
      { id: 'r1', exerciseId: 'squat', weightKg: 50 },
      { id: 'r2', exerciseId: 'squat', weightKg: 70 },
      { id: 'r3', exerciseId: 'squat', weightKg: 90 },
    ]);
    await new SaveLadderUseCase(repo).execute(
      'gym-1',
      'squat',
      { enabled: true, weights: { BRONZE: 50, SILVER: 70, GOLD: 90 } },
      staff(['leaderboard.manage']),
    );
    expect(repo.awardRungForExistingLifts).toHaveBeenCalledTimes(3);
  });

  it('switches a ladder off', async () => {
    await new SaveLadderUseCase(repo).execute('gym-1', 'squat', { enabled: false }, staff(['leaderboard.manage']));
    expect(repo.disableLadder).toHaveBeenCalledWith('gym-1', 'squat');
    expect(repo.saveLadder).not.toHaveBeenCalled();
    // A lift removed from the leaderboard can still have its ladder switched off.
    expect(repo.isLeaderboardLift).not.toHaveBeenCalled();
  });

  it('needs badges.manage', async () => {
    await expect(
      new SaveLadderUseCase(repo).execute('gym-1', 'squat', { enabled: false }, staff([])),
    ).rejects.toMatchObject({ code: 'PERMISSION_DENIED' });
  });
});

describe('GetBadgeCollectionUseCase', () => {
  const checkAuto = { awardFromStats: jest.fn() } as unknown as jest.Mocked<CheckAutoBadgesUseCase>;
  const useCase = () => new GetBadgeCollectionUseCase(repo, ladders, cache, checkAuto);

  beforeEach(() => {
    quietStats();
    repo.findMemberInGym.mockResolvedValue({ id: 'member-1' } as never);
    repo.findMemberByUserId.mockResolvedValue({ id: 'member-1' } as never);
    repo.listCatalogForGym.mockResolvedValue([
      { id: 'c1', name: 'Getting Started', description: '5 sessions', icon: 'barbell', color: '#000', category: 'CONSISTENCY', criteriaType: BadgeCriteriaType.SESSION_COUNT, criteriaValue: 5 },
      { id: 'c2', name: 'Getting Serious', description: '10 sessions', icon: 'barbell', color: '#000', category: 'CONSISTENCY', criteriaType: BadgeCriteriaType.SESSION_COUNT, criteriaValue: 10 },
    ] as never);
    repo.listMilestoneBadgesForCollection.mockResolvedValue([
      { id: 'm1', badgeName: 'Back Squat · Gold', description: null, icon: 'barbell', color: '#000', tier: 'GOLD', weightKg: '100', exercise: { id: 'squat', name: 'Back Squat' } },
    ] as never);
    repo.listCustomBadgesForCollection.mockResolvedValue([]);
    repo.listMemberBadges.mockResolvedValue([
      { id: 'mb1', badgeCatalogId: 'c1', milestoneBadgeId: null, customBadgeId: null, awardedAt: new Date('2026-11-01'), expiresAt: null, isEquipped: true, seenAt: new Date() },
    ] as never);
    repo.getBestApprovedLifts.mockResolvedValue(new Map([['squat', 85]]));
    repo.getBadgeHolderCounts.mockResolvedValue({ activeMembers: 20, holders: { 'catalog:c1': 5 } });
  });

  it('groups badges by category with earned state, progress and rarity', async () => {
    const result = await useCase().execute('gym-1', 'member-1', memberCaller);

    expect(result).toMatchObject({ earnedCount: 1, totalCount: 3 });
    const consistency = result.categories.find((c) => c.category === BadgeCategory.CONSISTENCY)!;
    expect(consistency.equipped?.key).toBe('catalog:c1');
    expect(consistency.badges[0]).toMatchObject({ earned: { memberBadgeId: 'mb1', isEquipped: true }, rarityPct: 25 });
    expect(consistency.badges[1]).toMatchObject({ earned: null, progress: { current: 5, target: 10, unit: 'sessions' } });

    const strength = result.categories.find((c) => c.category === BadgeCategory.STRENGTH)!;
    expect(strength.badges[0]).toMatchObject({ tier: 'GOLD', progress: { current: 85, target: 100, unit: 'kg' } });
    expect(ladders.ensureDefaultLaddersCached).toHaveBeenCalledWith('gym-1');
    expect(checkAuto.awardFromStats).toHaveBeenCalledWith('member-1', 'gym-1', expect.any(Array), expect.any(Object));
  });

  it("doesn't award badges when staff view a member's collection", async () => {
    repo.findMemberByUserId.mockResolvedValue({ id: 'staff-member' } as never);
    await useCase().execute('gym-1', 'member-1', staff(['members.view']));
    expect(checkAuto.awardFromStats).not.toHaveBeenCalled();
  });

  it("refuses another member's collection without members.view", async () => {
    repo.findMemberByUserId.mockResolvedValue({ id: 'someone-else' } as never);
    await expect(useCase().execute('gym-1', 'member-1', memberCaller)).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });
});
