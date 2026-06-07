import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CronLockService } from '../shared/cron-lock.service';
import { CRON_LOCK_TTL, CRON_SCHEDULE } from '../../config/cron.config';

const LOCK_KEY = 'lock:cron:announcement-publisher';

@Injectable()
export class AnnouncementPublisherJob {
  private readonly logger = new Logger(AnnouncementPublisherJob.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly lock: CronLockService,
  ) {}

  @Cron(CRON_SCHEDULE.ANNOUNCEMENT_PUBLISHER)
  async run(): Promise<void> {
    await this.lock.withLock(LOCK_KEY, CRON_LOCK_TTL.ANNOUNCEMENT_PUBLISHER, async () => {
      this.logger.log('started');
      const start = Date.now();

      try {
        const now = new Date();

        // Publish: SCHEDULED → PUBLISHED when publish_at has passed
        const published = await this.prisma.announcement.updateMany({
          where: { status: 'SCHEDULED', publishAt: { lte: now } },
          data: { status: 'PUBLISHED', updatedAt: new Date() },
        });

        // Expire: PUBLISHED → EXPIRED when expires_at has passed
        const expired = await this.prisma.announcement.updateMany({
          where: {
            status: 'PUBLISHED',
            expiresAt: { lte: now, not: null },
          },
          data: { status: 'EXPIRED', updatedAt: new Date() },
        });

        this.logger.log(
          `published ${published.count}, expired ${expired.count} in ${Date.now() - start}ms`,
        );
      } catch (err) {
        this.logger.error('failed', err instanceof Error ? err.message : String(err));
      }

      this.logger.log('completed');
    });
  }
}
