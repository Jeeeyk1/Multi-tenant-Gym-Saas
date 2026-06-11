import { Inject, Injectable } from '@nestjs/common';
import { STORAGE_PORT, StoragePort } from '../../../../common/adapters/storage/storage.port';

@Injectable()
export class UploadPrPhotoUseCase {
  constructor(
    @Inject(STORAGE_PORT) private readonly storage: StoragePort,
  ) {}

  async execute(gymId: string, buffer: Buffer): Promise<{ url: string }> {
    const result = await this.storage.uploadImage(buffer, {
      folder: `gyms/${gymId}/leaderboard`,
    });
    return { url: result.url };
  }
}
