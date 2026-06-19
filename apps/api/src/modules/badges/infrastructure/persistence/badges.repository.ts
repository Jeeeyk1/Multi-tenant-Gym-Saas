import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../common/prisma/prisma.service';
import { BadgeSource, BadgeRank } from '../../../../common/enums';

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

  findBadgeCatalogByKey(key: string) {
    return this.prisma.badgeCatalog.findUnique({ where: { key } });
  }

  // ── Member Badge Checks ────────────────────────────────────────────────────

  hasCatalogBadge(memberId: string, badgeCatalogId: string): Promise<boolean> {
    return this.prisma.memberBadge
      .count({ where: { memberId, badgeCatalogId } })
      .then((n) => n > 0);
  }

  hasMilestoneBadge(memberId: string, milestoneBadgeId: string): Promise<boolean> {
    return this.prisma.memberBadge
      .count({ where: { memberId, milestoneBadgeId } })
      .then((n) => n > 0);
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

  getMilestoneBadgesForExercise(gymId: string, exerciseId: string) {
    return this.prisma.exerciseMilestoneBadge.findMany({
      where: { gymId, exerciseId, isActive: true },
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
      createdByUserId: string;
    },
  ) {
    return this.prisma.gymCustomBadge.create({
      data: { gymId, ...data },
    });
  }

  // ── Award ──────────────────────────────────────────────────────────────────

  awardCatalogBadge(memberId: string, gymId: string, badgeCatalogId: string) {
    return this.prisma.memberBadge.create({
      data: { memberId, gymId, badgeCatalogId, source: BadgeSource.AUTO_SYSTEM },
    });
  }

  awardMilestoneBadge(memberId: string, gymId: string, milestoneBadgeId: string) {
    return this.prisma.memberBadge.create({
      data: { memberId, gymId, milestoneBadgeId, source: BadgeSource.AUTO_MILESTONE },
    });
  }

  awardCustomBadge(
    memberId: string,
    gymId: string,
    customBadgeId: string,
    awardedByUserId: string,
    proofUrl?: string,
    proofNotes?: string,
  ) {
    return this.prisma.memberBadge.create({
      data: {
        memberId,
        gymId,
        customBadgeId,
        source: BadgeSource.STAFF_AWARD,
        awardedByUserId,
        proofUrl: proofUrl ?? null,
        proofNotes: proofNotes ?? null,
      },
    });
  }

  awardCycleBadge(input: {
    memberId: string;
    gymId: string;
    badgeCatalogId: string;
    cycleId: string;
    rank: BadgeRank;
    expiresAt: Date;
    proofNotes?: string;
  }) {
    return this.prisma.memberBadge.create({
      data: {
        memberId: input.memberId,
        gymId: input.gymId,
        badgeCatalogId: input.badgeCatalogId,
        cycleId: input.cycleId,
        source: BadgeSource.AUTO_CYCLE,
        badgeRank: input.rank,
        expiresAt: input.expiresAt,
        proofNotes: input.proofNotes,
      },
    });
  }

  // ── Leaderboard Cycles ─────────────────────────────────────────────────────

  getActiveCycle(gymId: string) {
    return this.prisma.leaderboardCycle.findFirst({
      where: { gymId, status: 'ACTIVE' },
    });
  }

  getOldActiveCycles(olderThanDays: number) {
    const cutoff = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);
    return this.prisma.leaderboardCycle.findMany({
      where: { status: 'ACTIVE', startedAt: { lte: cutoff } },
    });
  }

  createCycle(gymId: string) {
    return this.prisma.leaderboardCycle.create({
      data: { gymId, status: 'ACTIVE' },
    });
  }

  closeCycle(cycleId: string) {
    return this.prisma.leaderboardCycle.update({
      where: { id: cycleId },
      data: { status: 'COMPLETED', endedAt: new Date() },
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
        AND status      = 'APPROVED'
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
}
