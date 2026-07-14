import { Injectable } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class RateLimiterService {
  constructor(private readonly redis: RedisService) {}

  /** Fixed-window counter. Returns true if the hit is within the limit. */
  async hit(key: string, limit: number, windowSeconds: number): Promise<boolean> {
    const client = this.redis.getClient();
    const count = await client.incr(key);
    if (count === 1) {
      await client.expire(key, windowSeconds);
    }
    return count <= limit;
  }
}
