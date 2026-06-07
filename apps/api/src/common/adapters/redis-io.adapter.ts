import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { Redis } from 'ioredis';
import { ServerOptions } from 'socket.io';

/**
 * Socket.io adapter backed by Redis pub/sub.
 *
 * Why this matters for scaling:
 *   When the API runs on multiple instances, a message emitted on Instance A
 *   would normally only reach clients connected to Instance A. The Redis adapter
 *   bridges all instances: every emit is published to Redis and all instances
 *   relay it to their local clients.
 *
 * Room strategy (works for all chat types):
 *   - Community chat  → 'conversation:{id}'
 *   - Future DM       → 'conversation:{id}'  (same — just a DIRECT conversation)
 *   - Future group    → 'conversation:{id}'  (same — just a GROUP conversation)
 *   - Future notify   → 'user:{userId}'       (add later with zero gateway changes)
 */
export class RedisIoAdapter extends IoAdapter {
  private adapterConstructor!: ReturnType<typeof createAdapter>;

  constructor(
    app: INestApplication,
    private readonly configService: ConfigService,
  ) {
    super(app);
  }

  async connectToRedis(): Promise<void> {
    const url = this.configService.getOrThrow<string>('redis.url');
    const pubClient = new Redis(url);
    const subClient = pubClient.duplicate();
    this.adapterConstructor = createAdapter(pubClient, subClient);
  }

  createIOServer(port: number, options?: ServerOptions) {
    const server = super.createIOServer(port, {
      ...options,
      cors: { origin: '*' },
    });
    server.adapter(this.adapterConstructor);
    return server;
  }
}
