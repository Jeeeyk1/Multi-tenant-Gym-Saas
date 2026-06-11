import { Module } from '@nestjs/common';
import { CloudinaryAdapter } from './cloudinary.adapter';
import { STORAGE_PORT } from './storage.port';

/**
 * Provides STORAGE_PORT via CloudinaryAdapter.
 * To switch to S3: replace `useClass: CloudinaryAdapter` with `useClass: S3Adapter`.
 */
@Module({
  providers: [
    CloudinaryAdapter,
    { provide: STORAGE_PORT, useClass: CloudinaryAdapter },
  ],
  exports: [STORAGE_PORT],
})
export class StorageModule {}
