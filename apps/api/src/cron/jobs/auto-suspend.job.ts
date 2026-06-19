import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CronLockService } from '../shared/cron-lock.service';
import { BATCH_SIZE, CRON_LOCK_TTL, CRON_SCHEDULE } from '../../config/cron.config';

const LOCK_KEY = 'lock:cron:auto-suspend';

@Injectable()
export class AutoSuspendJob {
  private readonly logger = new Logger(AutoSuspendJob.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly lock: CronLockService,
  ) {}

  @Cron(CRON_SCHEDULE.AUTO_SUSPEND)
  async run(): Promise<void> {
    await this.lock.withLock(LOCK_KEY, CRON_LOCK_TTL.AUTO_SUSPEND, async () => {
      this.logger.log('started');
      const start = Date.now();
      let totalProcessed = 0;

      try {
        const now = new Date();

        // eslint-disable-next-line no-constant-condition
        while (true) {
          // Load EXPIRED members with their gym's threshold config
          const batch = await this.prisma.gymMember.findMany({
            where: { status: 'EXPIRED' },
            select: {
              id: true,
              expiryDate: true,
              gym: { select: { autoSuspendMonths: true } },
            },
            take: BATCH_SIZE,
          });

          if (batch.length === 0) break;

          // Filter: only those past their gym's inactivity threshold
          const toSuspend = batch.filter((m) => {
            const threshold = new Date(now);
            threshold.setMonth(threshold.getMonth() - m.gym.autoSuspendMonths);
            return new Date(m.expiryDate) < threshold;
          });

          if (toSuspend.length > 0) {
            await this.prisma.gymMember.updateMany({
              where: { id: { in: toSuspend.map((m) => m.id) } },
              data: { status: 'SUSPENDED', updatedAt: new Date() },
            });
            totalProcessed += toSuspend.length;
          }

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
