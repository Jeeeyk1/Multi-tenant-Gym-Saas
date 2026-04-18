import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client!: Redis;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit(): Promise<void> {
    const url = this.configService.getOrThrow<string>('redis.url');

    this.client = new Redis(url, {
      // Retry connection up to 3 times before giving up on startup
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    });

    this.client.on('error', (err) => {
      this.logger.error('Redis connection error', err.message);
    });

    await this.client.connect();
    this.logger.log('Redis connection established');
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.quit();
  }

  getClient(): Redis {
    return this.client;
  }

  /**
   * Acquire a distributed lock using Redis SET NX EX.
   * Returns true if the lock was acquired, false if already held.
   *
   * Used by cron jobs to prevent duplicate execution across instances.
   *
   * @param key   Lock key — use format 'lock:cron:<job-name>'
   * @param ttl   Lock TTL in seconds (must exceed max expected job duration)
   */
  async acquireLock(key: string, ttl: number): Promise<boolean> {
    const result = await this.client.set(key, '1', 'EX', ttl, 'NX');
    return result === 'OK';
  }

  /**
   * Release a distributed lock.
   * Safe to call even if lock has already expired.
   */
  async releaseLock(key: string): Promise<void> {
    await this.client.del(key);
  }

  /**
   * Execute a function under a distributed lock.
   * If the lock cannot be acquired, fn is skipped silently.
   *
   * @param key   Lock key
   * @param ttl   Lock TTL in seconds
   * @param fn    Work to perform under the lock
   */
  async withLock(
    key: string,
    ttl: number,
    fn: () => Promise<void>,
  ): Promise<void> {
    const acquired = await this.acquireLock(key, ttl);
    if (!acquired) return;

    try {
      await fn();
    } finally {
      await this.releaseLock(key);
    }
  }
}
