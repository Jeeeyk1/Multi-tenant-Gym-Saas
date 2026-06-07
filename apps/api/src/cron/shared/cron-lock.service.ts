import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../../common/redis/redis.service';

@Injectable()
export class CronLockService {
  private readonly logger = new Logger(CronLockService.name);

  constructor(private readonly redis: RedisService) {}

  /**
   * Run `fn` under a distributed Redis lock.
   * Logs a skip message if the lock is already held by another instance.
   */
  async withLock(key: string, ttlSeconds: number, fn: () => Promise<void>): Promise<void> {
    const acquired = await this.redis.acquireLock(key, ttlSeconds);
    if (!acquired) {
      this.logger.log(`${key} — lock already held, skipping`);
      return;
    }
    try {
      await fn();
    } finally {
      await this.redis.releaseLock(key);
    }
  }
}
