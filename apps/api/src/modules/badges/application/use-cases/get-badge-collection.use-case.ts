import { Injectable, Logger } from '@nestjs/common';
import { ForbiddenError, NotFoundError } from '../../../../common/errors';
import { BadgeCategory, BadgeCriteriaType, Permission } from '../../../../common/enums';
import { CacheService } from '../../../../common/cache/cache.service';
import { BadgesRepository } from '../../infrastructure/persistence/badges.repository';
import { catalogProgress, type Progress } from '../../domain/badge-stats';
import { LADDER_TIERS } from '../../domain/lift-ladder';
import { loadBadgeStats } from '../badge-stats-loader';
import { LadderService } from '../ladder.service';
import { CheckAutoBadgesUseCase } from './check-auto-badges.use-case';
import type { AuthenticatedUser } from '../../../../common/types/auth.types';
import { assertGymAccess, hasPermission } from '../../../../common/auth/authorization';

const RARITY_TTL_SECONDS = 3600;
const CATEGORY_ORDER = [BadgeCategory.CONSISTENCY, BadgeCategory.LOYALTY, BadgeCategory.STRENGTH];

export interface EarnedBadge {
  memberBadgeId: string;
  awardedAt: Date;
  expiresAt: Date | null;
  expired: boolean;
  isEquipped: boolean;
  /** Null until the member has seen the "new badge" celebration. */
  seenAt: Date | null;
}

export interface CollectionBadge {
  /** Stable id for the badge definition: `catalog:<id>`, `milestone:<id>` or `custom:<id>`. */
  key: string;
  category: BadgeCategory;
  name: string;
  description: string | null;
  icon: string;
  color: string;
  tier: string | null;
  /** Ladder and milestone badges: the lift they belong to. */
  exercise: { id: string; name: string } | null;
  /** The member's most recent award of this badge, or null if locked. */
  earned: EarnedBadge | null;
  /** Cycle wins can be earned more than once. */
  timesEarned: number;
  progress: (Progress & { unit: string }) | null;
  /** Share of the gym's active members who hold this badge, 0–100. */
  rarityPct: number | null;
}

export interface BadgeCollection {
  earnedCount: number;
  totalCount: number;
  categories: { category: BadgeCategory; equipped: CollectionBadge | null; badges: CollectionBadge[] }[];
}

const UNIT: Partial<Record<BadgeCriteriaType, string>> = {
  [BadgeCriteriaType.SESSION_COUNT]: 'sessions',
  [BadgeCriteriaType.CHECKIN_STREAK]: 'days',
  [BadgeCriteriaType.WORKOUT_VARIETY]: 'workout types',
  [BadgeCriteriaType.EARLY_BIRD]: 'early check-ins',
  [BadgeCriteriaType.NIGHT_OWL]: 'late check-ins',
  [BadgeCriteriaType.WEEKLY_CONSISTENT]: 'weeks',
  [BadgeCriteriaType.MEMBERSHIP_MONTHS]: 'months',
};

/**
 * Every badge the gym offers, by category, with the member's earned state, progress
 * toward locked ones and how rare each badge is. The member themself, or staff with
 * members.view.
 */
@Injectable()
export class GetBadgeCollectionUseCase {
  private readonly logger = new Logger(GetBadgeCollectionUseCase.name);

  constructor(
    private readonly repo: BadgesRepository,
    private readonly ladders: LadderService,
    private readonly cache: CacheService,
    private readonly checkAuto: CheckAutoBadgesUseCase,
  ) {}

  async execute(gymId: string, memberId: string, caller: AuthenticatedUser): Promise<BadgeCollection> {
    assertGymAccess(caller, gymId);
    const member = await this.repo.findMemberInGym(gymId, memberId);
    if (!member) throw new NotFoundError('Member not found in this gym', 'MEMBER_NOT_FOUND');
    const self = caller.type === 'gym' ? await this.repo.findMemberByUserId(gymId, caller.sub) : null;
    const isSelf = self?.id === memberId;
    if (caller.type === 'gym' && !isSelf && !hasPermission(caller, Permission.MEMBERS_VIEW)) {
      throw new ForbiddenError("Cannot view another member's badges", 'FORBIDDEN');
    }

    await this.ladders.ensureDefaultLaddersCached(gymId);
    const now = new Date();
    const [catalog, stats, bestLifts, rarity] = await Promise.all([
      this.repo.listCatalogForGym(gymId),
      loadBadgeStats(this.repo, memberId, gymId, now),
      this.repo.getBestApprovedLifts(memberId, gymId),
      this.cache.wrap(`badges:rarity:${gymId}`, RARITY_TTL_SECONDS, () => this.repo.getBadgeHolderCounts(gymId)),
    ]);
    // Badges are normally awarded after check-ins and workouts. When members open their own
    // collection, award what they already qualify for (e.g. a new month of membership) so
    // it never shows 1/1 as locked. Staff viewing a member don't trigger awards.
    if (isSelf) {
      // Showing the collection matters more than this award pass; it runs again on the next check-in.
      try {
        await this.checkAuto.awardFromStats(memberId, gymId, catalog, stats);
      } catch (err) {
        this.logger.warn(`collection award pass failed gym=${gymId} member=${memberId}`, err instanceof Error ? err.stack : String(err));
      }
    }

    const owned = await this.repo.listMemberBadges(memberId, gymId);
    const ownedIds = (pick: (r: (typeof owned)[number]) => string | null) =>
      owned.map(pick).filter((id): id is string => id !== null);
    const [milestones, customs] = await Promise.all([
      this.repo.listMilestoneBadgesForCollection(gymId, ownedIds((r) => r.milestoneBadgeId)),
      this.repo.listCustomBadgesForCollection(gymId, ownedIds((r) => r.customBadgeId)),
    ]);

    // Owned rows by badge definition, newest first (listMemberBadges is ordered by awardedAt desc).
    const ownedByKey = new Map<string, typeof owned>();
    for (const row of owned) {
      const key = row.badgeCatalogId
        ? `catalog:${row.badgeCatalogId}`
        : row.milestoneBadgeId
          ? `milestone:${row.milestoneBadgeId}`
          : `custom:${row.customBadgeId}`;
      ownedByKey.set(key, [...(ownedByKey.get(key) ?? []), row]);
    }

    const earnedFor = (key: string): Pick<CollectionBadge, 'earned' | 'timesEarned'> => {
      const rows = ownedByKey.get(key) ?? [];
      // Prefer the equipped row, then the newest.
      const row = rows.find((r) => r.isEquipped) ?? rows[0];
      if (!row) return { earned: null, timesEarned: 0 };
      return {
        timesEarned: rows.length,
        earned: {
          memberBadgeId: row.id,
          awardedAt: row.awardedAt,
          expiresAt: row.expiresAt,
          expired: row.expiresAt !== null && row.expiresAt < now,
          isEquipped: row.isEquipped,
          seenAt: row.seenAt,
        },
      };
    };
    const rarityFor = (key: string) =>
      rarity.activeMembers > 0 ? Math.round(((rarity.holders[key] ?? 0) / rarity.activeMembers) * 100) : null;

    const badges: CollectionBadge[] = [
      ...catalog.map((b) => {
        const key = `catalog:${b.id}`;
        const progress = catalogProgress(b.criteriaType, b.criteriaValue, stats);
        return {
          key,
          category: b.category as BadgeCategory,
          name: b.name,
          description: b.description,
          icon: b.icon,
          color: b.color,
          tier: null,
          exercise: null,
          ...earnedFor(key),
          progress: progress ? { ...progress, unit: UNIT[b.criteriaType as BadgeCriteriaType] ?? '' } : null,
          rarityPct: rarityFor(key),
        };
      }),
      ...milestones
        .slice()
        .sort(
          (a, b) =>
            a.exercise.name.localeCompare(b.exercise.name) ||
            LADDER_TIERS.indexOf(a.tier as never) - LADDER_TIERS.indexOf(b.tier as never),
        )
        .map((m) => {
          const key = `milestone:${m.id}`;
          const target = Number(m.weightKg);
          return {
            key,
            category: BadgeCategory.STRENGTH,
            name: m.badgeName,
            description: m.description,
            icon: m.icon,
            color: m.color,
            tier: m.tier,
            exercise: { id: m.exercise.id, name: m.exercise.name },
            ...earnedFor(key),
            progress: { current: Math.min(bestLifts.get(m.exercise.id) ?? 0, target), target, unit: 'kg' },
            rarityPct: rarityFor(key),
          };
        }),
      ...customs.map((c) => {
        const key = `custom:${c.id}`;
        return {
          key,
          category: c.category as BadgeCategory,
          name: c.name,
          description: c.description,
          icon: c.icon,
          color: c.color,
          tier: null,
          exercise: null,
          ...earnedFor(key),
          progress: null,
          rarityPct: rarityFor(key),
        };
      }),
    ];

    return {
      earnedCount: badges.filter((b) => b.earned).length,
      totalCount: badges.length,
      categories: CATEGORY_ORDER.map((category) => {
        const inCategory = badges.filter((b) => b.category === category);
        return {
          category,
          equipped: inCategory.find((b) => b.earned?.isEquipped && !b.earned.expired) ?? null,
          badges: inCategory,
        };
      }),
    };
  }
}
