import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../common/prisma/prisma.service';
import { Prisma } from '@prisma/client';
import {
  BadgeCategory,
  BadgeSource,
  BadgeRank,
  LeaderboardCycleStatus,
  MemberStatus,
  PrSubmissionStatus,
} from '../../../../common/enums';
import type { LadderTier, LadderWeights } from '../../domain/lift-ladder';
import type { MembershipHistory } from '../../domain/badge-stats';
import { badgeKey } from '../../domain/badge-rarity';

const CATEGORY_ORDER = [BadgeCategory.CONSISTENCY, BadgeCategory.LOYALTY, BadgeCategory.STRENGTH];

/** One badge as shown next to a member's name (chat, leaderboard, Who's Here). */
export interface EquippedBadgeView {
  memberBadgeId: string;
  /** The badge definition (`catalog:<id>`, `milestone:<id>` or `custom:<id>`), as in the collection. */
  key: string;
  category: string;
  name: string;
  description: string | null;
  icon: string;
  color: string;
  /** GOLD / SILVER / BRONZE for cycle wins and ladder rungs. */
  tier: string | null;
  /** Cycle wins only (the leaderboard placing); null for ladder rungs. */
  rank: string | null;
  awardedAt: Date;
}

const BADGE_DEFINITION_SELECT = {
  badgeCatalog: { select: { name: true, description: true, icon: true, color: true } },
  customBadge: { select: { name: true, description: true, icon: true, color: true } },
  milestoneBadge: { select: { badgeName: true, description: true, icon: true, color: true, tier: true } },
} satisfies Prisma.MemberBadgeSelect;

type BadgeDefinitionRow = Prisma.MemberBadgeGetPayload<{ select: typeof BADGE_DEFINITION_SELECT }> & {
  badgeRank: string | null;
};

function badgeDefinition(r: BadgeDefinitionRow) {
  return {
    name: r.badgeCatalog?.name ?? r.customBadge?.name ?? r.milestoneBadge?.badgeName ?? 'Badge',
    description: r.badgeCatalog?.description ?? r.customBadge?.description ?? r.milestoneBadge?.description ?? null,
    icon: r.badgeCatalog?.icon ?? r.customBadge?.icon ?? r.milestoneBadge?.icon ?? 'ribbon',
    color: r.badgeCatalog?.color ?? r.customBadge?.color ?? r.milestoneBadge?.color ?? '#6B7280',
    tier: r.badgeRank ?? r.milestoneBadge?.tier ?? null,
  };
}

export interface CycleAward {
  memberId: string;
  badgeCatalogId: string;
  rank: BadgeRank;
  expiresAt: Date;
  proofNotes: string;
}

@Injectable()
export class BadgesRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ── Badge Catalog ──────────────────────────────────────────────────────────

  getEnabledBadgeCatalog(gymId: string) {
    return this.prisma.badgeCatalog.findMany({
      where: {
        isAutoAwarded: true,
        gymSettings: { none: { gymId, isEnabled: false } },
      },
    });
  }

  /** Every catalog badge enabled for the gym, including the non-auto cycle badges. */
  listCatalogForGym(gymId: string) {
    return this.prisma.badgeCatalog.findMany({
      where: { gymSettings: { none: { gymId, isEnabled: false } } },
      orderBy: [{ category: 'asc' }, { criteriaType: 'asc' }, { criteriaValue: 'asc' }],
    });
  }

  /** Catalog badges the member already holds (cycle wins excluded: they repeat). */
  async listOwnedCatalogBadgeIds(memberId: string): Promise<Set<string>> {
    const rows = await this.prisma.memberBadge.findMany({
      where: { memberId, badgeCatalogId: { not: null }, source: { not: BadgeSource.AUTO_CYCLE } },
      select: { badgeCatalogId: true },
    });
    return new Set(rows.map((r) => r.badgeCatalogId!));
  }

  findBadgeCatalogByKey(key: string) {
    return this.prisma.badgeCatalog.findUnique({ where: { key } });
  }

  // ── Member Stats ───────────────────────────────────────────────────────────

  getSessionCount(memberId: string) {
    return this.prisma.workoutSession.count({ where: { memberId } });
  }

  getDistinctWorkoutTypeCount(memberId: string): Promise<number> {
    return this.prisma.workoutSession
      .findMany({
        where: { memberId },
        select: { workoutType: true },
        distinct: ['workoutType'],
      })
      .then((rows) => rows.length);
  }

  getCheckinTimestamps(memberId: string): Promise<Date[]> {
    return this.prisma.checkIn
      .findMany({
        where: { memberId },
        select: { checkedInAt: true },
        orderBy: { checkedInAt: 'asc' },
      })
      .then((rows) => rows.map((r) => r.checkedInAt));
  }

  getSessionDates(memberId: string): Promise<Date[]> {
    return this.prisma.workoutSession
      .findMany({
        where: { memberId },
        select: { startedAt: true },
        orderBy: { startedAt: 'asc' },
      })
      .then((rows) => rows.map((r) => r.startedAt));
  }

  async getMemberJoinPosition(gymId: string, memberId: string): Promise<number> {
    const m = await this.prisma.gymMember.findUnique({
      where: { id: memberId },
      select: { joinedAt: true },
    });
    if (!m) return Infinity;
    return this.prisma.gymMember.count({
      where: { gymId, joinedAt: { lte: m.joinedAt } },
    });
  }

  async getMembershipHistory(memberId: string): Promise<MembershipHistory | null> {
    const m = await this.prisma.gymMember.findUnique({
      where: { id: memberId },
      select: {
        joinedAt: true,
        expiryDate: true,
        renewals: { select: { previousExpiry: true, newExpiry: true, renewedAt: true } },
      },
    });
    return m ? { joinedAt: m.joinedAt, expiryDate: m.expiryDate, renewals: m.renewals } : null;
  }

  async getGymTimezone(gymId: string): Promise<string> {
    const gym = await this.prisma.gym.findUnique({ where: { id: gymId }, select: { timezone: true } });
    return gym?.timezone ?? 'UTC';
  }

  /** Heaviest approved weight per exercise for a member (ladder progress). */
  async getBestApprovedLifts(memberId: string, gymId: string): Promise<Map<string, number>> {
    const rows = await this.prisma.memberPrSubmission.groupBy({
      by: ['exerciseId'],
      where: { memberId, gymId, status: PrSubmissionStatus.APPROVED },
      _max: { weightKg: true },
    });
    return new Map(rows.map((r) => [r.exerciseId, Number(r._max.weightKg ?? 0)]));
  }

  findMemberByUserId(gymId: string, userId: string) {
    return this.prisma.gymMember.findUnique({
      where: { gymId_userId: { gymId, userId } },
      select: { id: true },
    });
  }

  findMemberInGym(gymId: string, memberId: string) {
    return this.prisma.gymMember.findFirst({
      where: { id: memberId, gymId },
      select: { id: true },
    });
  }

  // ── Milestone Badges ───────────────────────────────────────────────────────

  async isLeaderboardLift(gymId: string, exerciseId: string): Promise<boolean> {
    const count = await this.prisma.gymLeaderboardExercise.count({ where: { gymId, exerciseId, isActive: true } });
    return count > 0;
  }

  getMilestoneBadgesForExercise(gymId: string, exerciseId: string) {
    return this.prisma.exerciseMilestoneBadge.findMany({
      where: { gymId, exerciseId, isActive: true },
    });
  }

  findExerciseForGym(gymId: string, exerciseId: string) {
    return this.prisma.exercise.findFirst({
      where: { id: exerciseId, OR: [{ gymId: null }, { gymId }] },
      select: { id: true, name: true, category: true },
    });
  }

  /** The gym's leaderboard lifts with their active ladder rungs. */
  listLadders(gymId: string) {
    return this.prisma.gymLeaderboardExercise.findMany({
      where: { gymId, isActive: true },
      select: {
        exercise: {
          select: {
            id: true,
            name: true,
            category: true,
            milestoneBadges: {
              where: { gymId, isActive: true, tier: { not: null } },
              select: { id: true, tier: true, weightKg: true },
            },
          },
        },
      },
    });
  }

  /**
   * Creates or updates the three rungs of a lift's ladder in one transaction. Existing
   * rungs keep their id, so members who already earned them keep their badges.
   */
  async saveLadder(
    gymId: string,
    exercise: { id: string; name: string },
    weights: LadderWeights,
    createdByUserId: string,
    naming: { name: (tier: LadderTier) => string; description: (weightKg: number) => string },
  ): Promise<{ id: string; exerciseId: string; weightKg: number }[]> {
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`ladder:${gymId}:${exercise.id}`}))`;
      const rungs: { id: string; exerciseId: string; weightKg: number }[] = [];
      for (const tier of Object.keys(weights) as LadderTier[]) {
        const weightKg = weights[tier];
        // Reuse the rung (even a switched-off one) so earned badges stay attached to it.
        const existing = await tx.exerciseMilestoneBadge.findFirst({
          where: { gymId, exerciseId: exercise.id, tier },
          orderBy: [{ isActive: 'desc' }, { updatedAt: 'desc' }],
          select: { id: true },
        });
        const data = { badgeName: naming.name(tier), description: naming.description(weightKg), weightKg, isActive: true };
        const saved = existing
          ? await tx.exerciseMilestoneBadge.update({ where: { id: existing.id }, data: { ...data, updatedAt: new Date() } })
          : await tx.exerciseMilestoneBadge.create({
              data: { ...data, gymId, exerciseId: exercise.id, tier, icon: 'barbell', color: '#B45309', createdByUserId },
            });
        rungs.push({ id: saved.id, exerciseId: exercise.id, weightKg });
      }
      return rungs;
    });
  }

  /**
   * Gives every leaderboard lift without a ladder the default one. A lift whose ladder
   * staff switched off keeps its (inactive) rungs, so it is not recreated.
   * Returns the new rungs so earlier approved lifts can be credited.
   */
  async createMissingLadders(
    gymId: string,
    build: (exercise: { id: string; name: string; category: string }) => Prisma.ExerciseMilestoneBadgeCreateManyInput[],
  ): Promise<{ id: string; exerciseId: string; weightKg: number }[]> {
    const lifts = await this.prisma.gymLeaderboardExercise.findMany({
      where: { gymId, isActive: true, exercise: { milestoneBadges: { none: { gymId, tier: { not: null } } } } },
      select: { exercise: { select: { id: true, name: true, category: true } } },
    });
    if (lifts.length === 0) return [];
    await this.prisma.exerciseMilestoneBadge.createMany({
      data: lifts.flatMap((l) => build(l.exercise)),
      skipDuplicates: true,
    });
    const rungs = await this.prisma.exerciseMilestoneBadge.findMany({
      where: { gymId, isActive: true, tier: { not: null }, exerciseId: { in: lifts.map((l) => l.exercise.id) } },
      select: { id: true, exerciseId: true, weightKg: true },
    });
    return rungs.map((r) => ({ ...r, weightKg: Number(r.weightKg) }));
  }

  /**
   * Credits a rung to every member whose approved lift already reaches it, e.g. when a
   * ladder is created or its weight lowered. No push: the app shows these as new badges.
   */
  async awardRungForExistingLifts(gymId: string, rung: { id: string; exerciseId: string; weightKg: number }): Promise<number> {
    return this.prisma.$executeRaw`
      INSERT INTO member_badges (member_id, gym_id, milestone_badge_id, category, source)
      SELECT DISTINCT s.member_id, ${gymId}::uuid, ${rung.id}::uuid, ${BadgeCategory.STRENGTH}, ${BadgeSource.AUTO_MILESTONE}
      FROM member_pr_submissions s
      WHERE s.gym_id = ${gymId}::uuid
        AND s.exercise_id = ${rung.exerciseId}::uuid
        AND s.status = ${PrSubmissionStatus.APPROVED}
        AND s.weight_kg >= ${rung.weightKg}
      ON CONFLICT DO NOTHING
    `;
  }

  async disableLadder(gymId: string, exerciseId: string): Promise<void> {
    await this.prisma.exerciseMilestoneBadge.updateMany({
      where: { gymId, exerciseId, tier: { not: null }, isActive: true },
      data: { isActive: false, updatedAt: new Date() },
    });
  }

  /** Active milestones plus switched-off ones the member already earned. */
  listMilestoneBadgesForCollection(gymId: string, ownedIds: string[]) {
    return this.prisma.exerciseMilestoneBadge.findMany({
      where: { gymId, OR: [{ isActive: true }, { id: { in: ownedIds } }] },
      include: { exercise: { select: { id: true, name: true } } },
    });
  }

  /** Active custom badges plus retired ones the member already earned. */
  listCustomBadgesForCollection(gymId: string, ownedIds: string[]) {
    return this.prisma.gymCustomBadge.findMany({
      where: { gymId, OR: [{ isActive: true }, { id: { in: ownedIds } }] },
      orderBy: { createdAt: 'desc' },
    });
  }

  listMilestoneBadges(gymId: string) {
    return this.prisma.exerciseMilestoneBadge.findMany({
      where: { gymId, isActive: true },
      include: { exercise: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  createMilestoneBadge(
    gymId: string,
    data: {
      exerciseId: string;
      badgeName: string;
      description?: string;
      weightKg: number;
      icon: string;
      color: string;
      createdByUserId: string;
    },
  ) {
    return this.prisma.exerciseMilestoneBadge.create({
      data: {
        gymId,
        exerciseId: data.exerciseId,
        badgeName: data.badgeName,
        description: data.description,
        weightKg: data.weightKg,
        icon: data.icon,
        color: data.color,
        createdByUserId: data.createdByUserId,
      },
    });
  }

  // ── Custom Badges ──────────────────────────────────────────────────────────

  findCustomBadge(gymId: string, customBadgeId: string) {
    return this.prisma.gymCustomBadge.findFirst({
      where: { id: customBadgeId, gymId, isActive: true },
      select: { id: true, name: true, category: true },
    });
  }

  listCustomBadges(gymId: string) {
    return this.prisma.gymCustomBadge.findMany({
      where: { gymId, isActive: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  createCustomBadge(
    gymId: string,
    data: {
      name: string;
      description?: string;
      icon: string;
      color: string;
      category: string;
      createdByUserId: string;
    },
  ) {
    return this.prisma.gymCustomBadge.create({
      data: { gymId, ...data },
    });
  }

  // ── Award ──────────────────────────────────────────────────────────────────

  /**
   * Awards a badge unless the member already has it (unique indexes, see 0048).
   * Returns true when a new badge was created, so the caller can notify the member.
   */
  private async awardOnce(data: Prisma.MemberBadgeCreateManyInput): Promise<boolean> {
    const { count } = await this.prisma.memberBadge.createMany({ data: [data], skipDuplicates: true });
    return count > 0;
  }

  awardCatalogBadge(memberId: string, gymId: string, badge: { id: string; category: string }) {
    return this.awardOnce({
      memberId,
      gymId,
      badgeCatalogId: badge.id,
      category: badge.category,
      source: BadgeSource.AUTO_SYSTEM,
    });
  }

  awardMilestoneBadge(memberId: string, gymId: string, milestoneBadgeId: string) {
    return this.awardOnce({
      memberId,
      gymId,
      milestoneBadgeId,
      category: BadgeCategory.STRENGTH,
      source: BadgeSource.AUTO_MILESTONE,
    });
  }

  awardCustomBadge(
    memberId: string,
    gymId: string,
    customBadge: { id: string; category: string },
    awardedByUserId: string,
    proofUrl?: string,
    proofNotes?: string,
  ) {
    return this.prisma.memberBadge.create({
      data: {
        memberId,
        gymId,
        customBadgeId: customBadge.id,
        category: customBadge.category,
        source: BadgeSource.STAFF_AWARD,
        awardedByUserId,
        proofUrl: proofUrl ?? null,
        proofNotes: proofNotes ?? null,
      },
    });
  }

  // ── Leaderboard Cycles ─────────────────────────────────────────────────────

  getActiveCycle(gymId: string) {
    return this.prisma.leaderboardCycle.findFirst({
      where: { gymId, status: LeaderboardCycleStatus.ACTIVE },
    });
  }

  getOldActiveCycles(olderThanDays: number) {
    const cutoff = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);
    return this.prisma.leaderboardCycle.findMany({
      where: { status: LeaderboardCycleStatus.ACTIVE, startedAt: { lte: cutoff } },
    });
  }

  createCycle(gymId: string) {
    return this.prisma.leaderboardCycle.create({
      data: { gymId, status: LeaderboardCycleStatus.ACTIVE },
    });
  }

  /**
   * Closes a cycle, awards its winners and opens the next cycle, all or nothing. A failure
   * leaves the cycle active, so the next cron run retries it without duplicate awards.
   * Returns false when the cycle was already closed (e.g. a second run), and changes nothing.
   */
  async completeCycle(cycleId: string, gymId: string, endedAt: Date, awards: CycleAward[]): Promise<boolean> {
    return this.prisma.$transaction(async (tx) => {
      const closed = await tx.leaderboardCycle.updateMany({
        where: { id: cycleId, status: LeaderboardCycleStatus.ACTIVE },
        data: { status: LeaderboardCycleStatus.COMPLETED, endedAt },
      });
      if (closed.count === 0) return false;
      await tx.memberBadge.createMany({
        data: awards.map((a) => ({
          memberId: a.memberId,
          gymId,
          badgeCatalogId: a.badgeCatalogId,
          cycleId,
          category: BadgeCategory.STRENGTH,
          source: BadgeSource.AUTO_CYCLE,
          badgeRank: a.rank,
          expiresAt: a.expiresAt,
          proofNotes: a.proofNotes,
        })),
      });
      await tx.leaderboardCycle.create({ data: { gymId, status: LeaderboardCycleStatus.ACTIVE } });
      return true;
    });
  }

  getLeaderboardExercises(gymId: string) {
    return this.prisma.gymLeaderboardExercise.findMany({
      where: { gymId, isActive: true },
      include: { exercise: { select: { id: true, name: true } } },
    });
  }

  async getTopMembersForExercise(
    gymId: string,
    exerciseId: string,
    cycleStart: Date,
    cycleEnd: Date,
    limit = 3,
  ): Promise<Array<{ memberId: string; best1rm: number }>> {
    const rows = await this.prisma.$queryRaw<Array<{ member_id: string; best_1rm: number }>>`
      SELECT member_id, MAX(estimated_1rm) AS best_1rm
      FROM member_pr_submissions
      WHERE gym_id      = ${gymId}::uuid
        AND exercise_id = ${exerciseId}::uuid
        AND status      = ${PrSubmissionStatus.APPROVED}
        AND reviewed_at >= ${cycleStart}
        AND reviewed_at <= ${cycleEnd}
      GROUP BY member_id
      ORDER BY best_1rm DESC
      LIMIT ${limit}
    `;
    return rows.map((r) => ({ memberId: r.member_id, best1rm: Number(r.best_1rm) }));
  }

  // ── List ───────────────────────────────────────────────────────────────────

  listMemberBadges(memberId: string, gymId: string) {
    return this.prisma.memberBadge.findMany({
      where: { memberId, gymId },
      orderBy: { awardedAt: 'desc' },
      include: {
        badgeCatalog: true,
        customBadge: true,
        milestoneBadge: {
          include: { exercise: { select: { id: true, name: true } } },
        },
        cycle: { select: { id: true, startedAt: true, endedAt: true } },
      },
    });
  }

  // ── Equip ──────────────────────────────────────────────────────────────────

  findMemberBadge(badgeId: string, memberId: string, gymId: string) {
    return this.prisma.memberBadge.findFirst({
      where: { id: badgeId, memberId, gymId },
      select: { id: true, isEquipped: true, expiresAt: true, category: true },
    });
  }

  /**
   * Equips or unequips a badge. Equipping first unequips the member's other badge in
   * the same category: one per category, three at most (also a DB rule, see 0048).
   */
  async setBadgeEquipped(
    badge: { id: string; category: string },
    memberId: string,
    gymId: string,
    equipped: boolean,
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      // Serialise equips in the same slot so a double tap can't break the one-per-category rule.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`equip:${memberId}:${badge.category}`}))`;
      if (equipped) {
        await tx.memberBadge.updateMany({
          where: { memberId, gymId, category: badge.category, isEquipped: true, NOT: { id: badge.id } },
          data: { isEquipped: false },
        });
      }
      await tx.memberBadge.update({ where: { id: badge.id }, data: { isEquipped: equipped } });
    });
  }

  /** Unequips badges that have expired (cycle wins last 30 days). */
  async unequipExpiredBadges(): Promise<number> {
    const { count } = await this.prisma.memberBadge.updateMany({
      where: { isEquipped: true, expiresAt: { lt: new Date() } },
      data: { isEquipped: false },
    });
    return count;
  }

  async markBadgesSeen(memberId: string, gymId: string, badgeIds: string[]): Promise<void> {
    await this.prisma.memberBadge.updateMany({
      where: { id: { in: badgeIds }, memberId, gymId, seenAt: null },
      data: { seenAt: new Date() },
    });
  }

  /**
   * Each user's equipped badges across the gym (up to three, in category order).
   * Used to render badges next to names in chat, leaderboard and Who's Here.
   * Excludes expired badges.
   */
  async listEquippedBadgesByGym(gymId: string): Promise<{ userId: string; badges: EquippedBadgeView[] }[]> {
    const now = new Date();
    const rows = await this.prisma.memberBadge.findMany({
      where: { gymId, isEquipped: true, OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
      select: {
        id: true,
        category: true,
        badgeRank: true,
        awardedAt: true,
        badgeCatalogId: true,
        milestoneBadgeId: true,
        customBadgeId: true,
        member: { select: { user: { select: { id: true } } } },
        ...BADGE_DEFINITION_SELECT,
      },
    });

    const byUser = new Map<string, EquippedBadgeView[]>();
    for (const r of rows) {
      const list = byUser.get(r.member.user.id) ?? [];
      list.push({
        memberBadgeId: r.id,
        key: badgeKey(r),
        category: r.category,
        awardedAt: r.awardedAt,
        rank: r.badgeRank,
        ...badgeDefinition(r),
      });
      byUser.set(r.member.user.id, list);
    }
    return [...byUser.entries()].map(([userId, badges]) => ({
      userId,
      badges: badges.sort(
        (a, b) =>
          CATEGORY_ORDER.indexOf(a.category as BadgeCategory) - CATEGORY_ORDER.indexOf(b.category as BadgeCategory),
      ),
    }));
  }

  /**
   * How many active members hold each badge, and how many active members there are.
   * Keys: `catalog:<id>`, `milestone:<id>`, `custom:<id>`.
   */
  async getBadgeHolderCounts(gymId: string): Promise<{ activeMembers: number; holders: Record<string, number> }> {
    const [rows, activeMembers] = await Promise.all([
      this.prisma.$queryRaw<{ catalog_id: string | null; milestone_id: string | null; custom_id: string | null; holders: number }[]>`
        SELECT mb.badge_catalog_id AS catalog_id, mb.milestone_badge_id AS milestone_id,
               mb.custom_badge_id AS custom_id, COUNT(DISTINCT mb.member_id)::int AS holders
        FROM member_badges mb
        JOIN gym_members gm ON gm.id = mb.member_id AND gm.status = ${MemberStatus.ACTIVE}
        WHERE mb.gym_id = ${gymId}::uuid
          AND (mb.expires_at IS NULL OR mb.expires_at > now())
        GROUP BY 1, 2, 3
      `,
      this.prisma.gymMember.count({ where: { gymId, status: MemberStatus.ACTIVE } }),
    ]);
    const holders: Record<string, number> = {};
    for (const r of rows) {
      holders[badgeKey({ badgeCatalogId: r.catalog_id, milestoneBadgeId: r.milestone_id, customBadgeId: r.custom_id })] = r.holders;
    }
    return { activeMembers, holders };
  }

  /** The user id and push tokens for a member, to tell them about a new badge. */
  findMemberPushTargets(memberId: string) {
    return this.prisma.gymMember.findUnique({
      where: { id: memberId },
      select: {
        gym: { select: { name: true } },
        user: { select: { id: true, deviceTokens: { select: { token: true } } } },
      },
    });
  }
}
