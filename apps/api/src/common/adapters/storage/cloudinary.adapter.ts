import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';
import type { StoragePort, UploadResult } from './storage.port';

@Injectable()
export class CloudinaryAdapter implements StoragePort {
  constructor(private readonly config: ConfigService) {
    cloudinary.config({
      cloud_name: this.config.get<string>('CLOUDINARY_CLOUD_NAME'),
      api_key: this.config.get<string>('CLOUDINARY_API_KEY'),
      api_secret: this.config.get<string>('CLOUDINARY_API_SECRET'),
    });
  }

  uploadImage(
    buffer: Buffer,
    options: { folder?: string; publicId?: string },
  ): Promise<UploadResult> {
    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: options.folder ?? 'gym-saas',
          public_id: options.publicId,
          resource_type: 'image',
          overwrite: true,
          // Limit logo dimensions server-side so storage costs stay predictable
          transformation: [{ width: 400, height: 400, crop: 'limit' }],
        },
        (error, result) => {
          if (error) return reject(new Error(error.message));
          if (!result) return reject(new Error('Cloudinary returned no result'));
          resolve({ url: result.secure_url, publicId: result.public_id });
        },
      );
      stream.end(buffer);
    });
  }

  async deleteImage(publicId: string): Promise<void> {
    await cloudinary.uploader.destroy(publicId);
  }

  async deleteImageByUrl(url: string, allowedFolders: string[]): Promise<boolean> {
    const publicId = publicIdFromUrl(url, this.config.get<string>('CLOUDINARY_CLOUD_NAME') ?? '');
    if (!publicId || !isUnderFolder(publicId, allowedFolders)) return false;
    // destroy() reports "not found" in its result instead of throwing.
    const { result } = (await cloudinary.uploader.destroy(publicId)) as { result?: string };
    return result === 'ok';
  }
}

/** True when `publicId` sits inside one of the folders (a trailing slash is added, so "a/b" doesn't match "a/bc/x"). */
export function isUnderFolder(publicId: string, folders: string[]): boolean {
  return folders.some((folder) => publicId.startsWith(folder.replace(/\/?$/, '/')));
}

/**
 * The public id in a delivery URL from our own account, e.g.
 * https://res.cloudinary.com/<cloud>/image/upload/v1712/gym-saas/prs/abc.jpg -> gym-saas/prs/abc.
 * Null for any other URL.
 */
export function publicIdFromUrl(url: string, cloudName: string): string | null {
  if (!cloudName) return null;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (parsed.protocol !== 'https:' || parsed.hostname !== 'res.cloudinary.com') return null;
  const prefix = `/${cloudName}/image/upload/`;
  if (!parsed.pathname.startsWith(prefix)) return null;
  const path = parsed.pathname.slice(prefix.length).replace(/^v\d+\//, '');
  const publicId = decodeURIComponent(path.replace(/\.[a-z0-9]+$/i, ''));
  return publicId || null;
}
