import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';

/**
 * Thin Redis-backed cache with a cache-aside `wrap` helper.
 *
 * Fail-open by design: if Redis is unavailable, every operation degrades to a
 * cache miss and the caller falls back to its source of truth (the DB). A cache
 * outage must never become an application outage.
 *
 * Note: `get` cannot distinguish "miss" from a cached `null`. Only cache values
 * that are never legitimately `null` (arrays, objects) with `wrap`.
 */
@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);

  constructor(private readonly redis: RedisService) {}

  async get<T>(key: string): Promise<T | null> {
    try {
      const raw = await this.redis.getClient().get(key);
      return raw ? (JSON.parse(raw) as T) : null;
    } catch (err) {
      this.logger.warn(`cache get failed for "${key}": ${String(err)}`);
      return null;
    }
  }

  async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    try {
      await this.redis.getClient().set(key, JSON.stringify(value), 'EX', ttlSeconds);
    } catch (err) {
      this.logger.warn(`cache set failed for "${key}": ${String(err)}`);
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.redis.getClient().del(key);
    } catch (err) {
      this.logger.warn(`cache del failed for "${key}": ${String(err)}`);
    }
  }

  /** Return the cached value, or compute it, store it with a TTL, and return it. */
  async wrap<T>(key: string, ttlSeconds: number, compute: () => Promise<T>): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) return cached;
    const value = await compute();
    await this.set(key, value, ttlSeconds);
    return value;
  }
}
