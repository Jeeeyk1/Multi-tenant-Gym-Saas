import { Inject, Injectable } from '@nestjs/common';
import { STORAGE_PORT, StoragePort } from '../../../../common/adapters/storage/storage.port';

@Injectable()
export class UploadFoodPhotoUseCase {
  constructor(
    @Inject(STORAGE_PORT) private readonly storage: StoragePort,
  ) {}

  async execute(memberId: string, buffer: Buffer): Promise<{ url: string }> {
    const result = await this.storage.uploadImage(buffer, {
      folder: `members/${memberId}/food-logs`,
    });
    return { url: result.url };
  }
}
