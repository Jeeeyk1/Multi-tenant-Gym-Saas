import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../common/prisma/prisma.service';
import { PrSubmissionStatus } from '../../../../common/enums';

@Injectable()
export class LeaderboardRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ── Member lookup ──────────────────────────────────────────────────────────

  findMemberByUserId(userId: string, gymId: string) {
    return this.prisma.gymMember.findUnique({
      where: { gymId_userId: { gymId, userId } },
      select: { id: true, status: true },
    });
  }

  // ── Exercises ──────────────────────────────────────────────────────────────

  listExercises(gymId: string) {
    return this.prisma.exercise.findMany({
      where: {
        isActive: true,
        OR: [{ gymId: null }, { gymId }],
      },
      select: { id: true, name: true, category: true, gymId: true },
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    });
  }

  findExerciseById(exerciseId: string) {
    return this.prisma.exercise.findUnique({
      where: { id: exerciseId },
      select: { id: true, name: true, category: true, gymId: true, isActive: true },
    });
  }

  createGymExercise(gymId: string, name: string, category: string) {
    return this.prisma.exercise.create({
      data: { gymId, name, category },
      select: { id: true, name: true, category: true, gymId: true },
    });
  }

  // ── Leaderboard config ─────────────────────────────────────────────────────

  getLeaderboardConfig(gymId: string) {
    return this.prisma.gymLeaderboardExercise.findMany({
      where: { gymId },
      select: {
        id: true,
        displayOrder: true,
        isActive: true,
        exercise: { select: { id: true, name: true, category: true } },
      },
      orderBy: { displayOrder: 'asc' },
    });
  }

  upsertLeaderboardExercise(
    gymId: string,
    exerciseId: string,
    isActive: boolean,
    displayOrder: number,
    enabledByUserId: string,
  ) {
    return this.prisma.gymLeaderboardExercise.upsert({
      where: { gymId_exerciseId: { gymId, exerciseId } },
      create: { gymId, exerciseId, isActive, displayOrder, enabledByUserId },
      update: { isActive, displayOrder },
      select: { id: true, isActive: true, displayOrder: true },
    });
  }

  // ── Photo upload (delegates to StoragePort — no DB op here) ───────────────

  // ── PR submissions ─────────────────────────────────────────────────────────

  createSubmission(data: {
    gymId: string;
    memberId: string;
    exerciseId: string;
    weightKg: number;
    reps: number;
    estimated1rm: number;
    photoUrl: string;
    status: string;
    submissionType: string;
    submittedByUserId: string;
    notes?: string;
  }) {
    return this.prisma.memberPrSubmission.create({
      data: {
        gymId: data.gymId,
        memberId: data.memberId,
        exerciseId: data.exerciseId,
        weightKg: data.weightKg,
        reps: data.reps,
        estimated1rm: data.estimated1rm,
        photoUrl: data.photoUrl,
        status: data.status,
        submissionType: data.submissionType,
        submittedByUserId: data.submittedByUserId,
        notes: data.notes,
      },
      select: this.submissionSelect(),
    });
  }

  findSubmissionById(submissionId: string, gymId: string) {
    return this.prisma.memberPrSubmission.findFirst({
      where: { id: submissionId, gymId },
      select: this.submissionSelect(),
    });
  }

  listPendingSubmissions(gymId: string) {
    return this.prisma.memberPrSubmission.findMany({
      where: { gymId, status: PrSubmissionStatus.PENDING },
      select: this.submissionSelect(),
      orderBy: { submittedAt: 'asc' },
    });
  }

  approveSubmission(submissionId: string, reviewedByUserId: string) {
    return this.prisma.memberPrSubmission.update({
      where: { id: submissionId },
      data: {
        status: PrSubmissionStatus.APPROVED,
        reviewedByUserId,
        reviewedAt: new Date(),
      },
      select: this.submissionSelect(),
    });
  }

  rejectSubmission(
    submissionId: string,
    reviewedByUserId: string,
    rejectionReason: string,
  ) {
    return this.prisma.memberPrSubmission.update({
      where: { id: submissionId },
      data: {
        status: PrSubmissionStatus.REJECTED,
        reviewedByUserId,
        reviewedAt: new Date(),
        rejectionReason,
      },
      select: this.submissionSelect(),
    });
  }

  // ── Leaderboard queries ────────────────────────────────────────────────────

  /** Best APPROVED 1RM per member for a single exercise. */
  async getExerciseLeaderboard(gymId: string, exerciseId: string, limit = 10) {
    const rows = await this.prisma.memberPrSubmission.groupBy({
      by: ['memberId'],
      where: { gymId, exerciseId, status: PrSubmissionStatus.APPROVED },
      _max: { estimated1rm: true },
      orderBy: { _max: { estimated1rm: 'desc' } },
      take: limit,
    });

    if (rows.length === 0) return [];

    // Fetch member names and best submission details
    const memberIds = rows.map((r) => r.memberId);
    const bestSubmissions = await Promise.all(
      rows.map(async (row) => {
        const sub = await this.prisma.memberPrSubmission.findFirst({
          where: {
            gymId,
            exerciseId,
            memberId: row.memberId,
            status: PrSubmissionStatus.APPROVED,
            estimated1rm: row._max.estimated1rm ?? undefined,
          },
          select: {
            id: true,
            weightKg: true,
            reps: true,
            estimated1rm: true,
            photoUrl: true,
            submittedAt: true,
            member: {
              select: { user: { select: { fullName: true } } },
            },
          },
          orderBy: { submittedAt: 'desc' },
        });
        return sub;
      }),
    );

    return bestSubmissions
      .filter((s) => s !== null)
      .map((s, index) => ({ rank: index + 1, ...s! }));
  }

  /** All enabled exercises for a gym with their top entry (for the full board view). */
  async getFullLeaderboard(gymId: string, topN = 10) {
    const enabledExercises = await this.prisma.gymLeaderboardExercise.findMany({
      where: { gymId, isActive: true },
      select: { exercise: { select: { id: true, name: true, category: true } }, displayOrder: true },
      orderBy: { displayOrder: 'asc' },
    });

    const results = await Promise.all(
      enabledExercises.map(async ({ exercise, displayOrder }) => ({
        exercise,
        displayOrder,
        entries: await this.getExerciseLeaderboard(gymId, exercise.id, topN),
      })),
    );

    return results;
  }

  /** Member's own best approved PR per exercise + any pending. */
  getMyPrs(memberId: string, gymId: string) {
    return this.prisma.memberPrSubmission.findMany({
      where: { memberId, gymId },
      select: {
        id: true,
        weightKg: true,
        reps: true,
        estimated1rm: true,
        photoUrl: true,
        status: true,
        rejectionReason: true,
        submittedAt: true,
        exercise: { select: { id: true, name: true, category: true } },
      },
      orderBy: [{ exerciseId: 'asc' }, { estimated1rm: 'desc' }],
    });
  }

  // ── Shared select shape ────────────────────────────────────────────────────

  private submissionSelect() {
    return {
      id: true,
      gymId: true,
      weightKg: true,
      reps: true,
      estimated1rm: true,
      photoUrl: true,
      status: true,
      submissionType: true,
      notes: true,
      rejectionReason: true,
      submittedAt: true,
      reviewedAt: true,
      exercise: { select: { id: true, name: true, category: true } },
      member: {
        select: {
          id: true,
          membershipNumber: true,
          user: { select: { id: true, fullName: true } },
        },
      },
      submittedByUser: { select: { id: true, fullName: true } },
      reviewedByUser: { select: { id: true, fullName: true } },
    } as const;
  }
}
