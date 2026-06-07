import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CronLockService } from '../shared/cron-lock.service';
import { BATCH_SIZE, CRON_LOCK_TTL, CRON_SCHEDULE } from '../../config/cron.config';

const LOCK_KEY = 'lock:cron:auto-checkout';

@Injectable()
export class AutoCheckoutJob {
  private readonly logger = new Logger(AutoCheckoutJob.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly lock: CronLockService,
  ) {}

  @Cron(CRON_SCHEDULE.AUTO_CHECKOUT)
  async run(): Promise<void> {
    await this.lock.withLock(LOCK_KEY, CRON_LOCK_TTL.AUTO_CHECKOUT, async () => {
      this.logger.log('started');
      const start = Date.now();
      let totalProcessed = 0;

      try {
        const now = new Date();

        while (true) {
          // Load open check-ins with their gym's auto-checkout threshold
          const batch = await this.prisma.checkIn.findMany({
            where: { checkedOutAt: null },
            select: {
              id: true,
              checkedInAt: true,
              gym: { select: { autoCheckoutHours: true } },
            },
            take: BATCH_SIZE,
          });

          if (batch.length === 0) break;

          // Filter: only those that have exceeded the gym's threshold
          const toClose = batch.filter((c) => {
            const threshold = new Date(now.getTime() - c.gym.autoCheckoutHours * 60 * 60 * 1000);
            return c.checkedInAt < threshold;
          });

          if (toClose.length > 0) {
            await this.prisma.checkIn.updateMany({
              where: { id: { in: toClose.map((c) => c.id) } },
              data: { checkedOutAt: now, isAutoCheckout: true },
            });
            totalProcessed += toClose.length;
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
