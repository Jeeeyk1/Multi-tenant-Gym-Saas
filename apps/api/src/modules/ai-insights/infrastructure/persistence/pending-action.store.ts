import { Injectable } from '@nestjs/common';
import { RedisService } from '../../../../common/redis/redis.service';
import { PENDING_ACTION_TTL_SECONDS, type PendingAction } from '../../domain/pending-action';

/**
 * Proposed assistant actions waiting for confirmation, in Redis with a TTL.
 * Not the fail-open CacheService: if Redis is down, actions fail instead of
 * being lost or run twice. Keys include the gym and the person, so one user
 * can never see, confirm or cancel another's action.
 */
@Injectable()
export class PendingActionStore {
  constructor(private readonly redis: RedisService) {}

  async save(pending: PendingAction): Promise<void> {
    const key = this.key(pending.gymId, pending.userId, pending.id);
    await this.redis.getClient().set(key, JSON.stringify(pending), 'EX', PENDING_ACTION_TTL_SECONDS);
  }

  /** Removes and returns the action atomically, so it can be confirmed only once. Null if expired or handled. */
  async take(gymId: string, userId: string, id: string): Promise<PendingAction | null> {
    const raw = await this.redis.getClient().getdel(this.key(gymId, userId, id));
    return raw ? (JSON.parse(raw) as PendingAction) : null;
  }

  private key(gymId: string, userId: string, id: string): string {
    return `insights:action:${gymId}:${userId}:${id}`;
  }
}
