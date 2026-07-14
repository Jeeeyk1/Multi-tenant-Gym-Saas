import { Global, Module } from '@nestjs/common';
import { CacheService } from './cache.service';

/** Global — CacheService is available everywhere (backed by the global RedisService). */
@Global()
@Module({
  providers: [CacheService],
  exports: [CacheService],
})
export class CacheModule {}
