import { Global, Module } from '@nestjs/common';
import { RedisService } from './redis.service';

/**
 * Global module — RedisService is available in every module
 * without needing to import RedisModule explicitly.
 * Used by cron jobs for distributed locking.
 */
@Global()
@Module({
  providers: [RedisService],
  exports: [RedisService],
})
export class RedisModule {}
