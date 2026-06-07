import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CronLockService } from '../shared/cron-lock.service';
import { BATCH_SIZE, CRON_LOCK_TTL, CRON_SCHEDULE } from '../../config/cron.config';

const LOCK_KEY = 'lock:cron:membership-expiry';

@Injectable()
export class MembershipExpiryJob {
  private readonly logger = new Logger(MembershipExpiryJob.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly lock: CronLockService,
  ) {}

  @Cron(CRON_SCHEDULE.MEMBERSHIP_EXPIRY)
  async run(): Promise<void> {
    await this.lock.withLock(LOCK_KEY, CRON_LOCK_TTL.MEMBERSHIP_EXPIRY, async () => {
      this.logger.log('started');
      const start = Date.now();
      let totalProcessed = 0;

      try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        while (true) {
          const batch = await this.prisma.gymMember.findMany({
            where: { status: 'ACTIVE', expiryDate: { lt: today } },
            select: { id: true },
            take: BATCH_SIZE,
          });

          if (batch.length === 0) break;

          await this.prisma.gymMember.updateMany({
            where: { id: { in: batch.map((m) => m.id) } },
            data: { status: 'EXPIRED', updatedAt: new Date() },
          });

          totalProcessed += batch.length;
          if (batch.length < BATCH_SIZE) break;
        }

        this.logger.log(`processed ${totalProcessed} records in ${Date.now() - start}ms`);
      } catch (err) {
        this.logger.error('failed', err instanceof Error ? err.message : String(err));
      }

      this.logger.log('completed');
    });
  }
}
