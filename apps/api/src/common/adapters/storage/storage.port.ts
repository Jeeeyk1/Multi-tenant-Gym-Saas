export interface UploadResult {
  url: string;
  publicId: string;
}

export interface StoragePort {
  uploadImage(
    buffer: Buffer,
    options: { folder?: string; publicId?: string },
  ): Promise<UploadResult>;
  deleteImage(publicId: string): Promise<void>;
  /**
   * Deletes an image by the URL we stored, only if it's in our account and under one of
   * `allowedFolders` (URLs come from clients, so this keeps one person from deleting another's
   * file or a gym logo). Returns false when it deleted nothing.
   */
  deleteImageByUrl(url: string, allowedFolders: string[]): Promise<boolean>;
}

export const STORAGE_PORT = Symbol('STORAGE_PORT');
