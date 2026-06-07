import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../common/prisma/prisma.service';

const ANNOUNCEMENT_SELECT = {
  id: true,
  gymId: true,
  title: true,
  content: true,
  status: true,
  targetAudience: true,
  isPinned: true,
  publishAt: true,
  expiresAt: true,
  createdAt: true,
  updatedAt: true,
  createdByUser: { select: { id: true, fullName: true } },
} as const;

@Injectable()
export class AnnouncementsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findById(announcementId: string, gymId: string) {
    return this.prisma.announcement.findFirst({
      where: { id: announcementId, gymId },
      select: ANNOUNCEMENT_SELECT,
    });
  }

  listByGym(gymId: string, statusFilter?: string) {
    return this.prisma.announcement.findMany({
      where: {
        gymId,
        ...(statusFilter ? { status: statusFilter } : {}),
      },
      select: ANNOUNCEMENT_SELECT,
      orderBy: [{ isPinned: 'desc' }, { publishAt: 'desc' }, { createdAt: 'desc' }],
    });
  }

  create(input: {
    gymId: string;
    createdBy: string;
    title: string;
    content: string;
    status: string;
    isPinned: boolean;
    publishAt?: Date;
    expiresAt?: Date;
  }) {
    return this.prisma.announcement.create({
      data: {
        gymId: input.gymId,
        createdBy: input.createdBy,
        title: input.title,
        content: input.content,
        status: input.status,
        isPinned: input.isPinned,
        publishAt: input.publishAt,
        expiresAt: input.expiresAt,
      },
      select: ANNOUNCEMENT_SELECT,
    });
  }

  update(
    announcementId: string,
    data: {
      title?: string;
      content?: string;
      status?: string;
      isPinned?: boolean;
      publishAt?: Date | null;
      expiresAt?: Date | null;
    },
  ) {
    return this.prisma.announcement.update({
      where: { id: announcementId },
      data: { ...data, updatedAt: new Date() },
      select: ANNOUNCEMENT_SELECT,
    });
  }

  /**
   * Upserts an announcement_read record.
   * Silently ignores the unique constraint if the user already read it.
   */
  async markRead(announcementId: string, userId: string): Promise<void> {
    await this.prisma.announcementRead.upsert({
      where: { announcementId_userId: { announcementId, userId } },
      create: { announcementId, userId },
      update: {},
    });
  }
}
