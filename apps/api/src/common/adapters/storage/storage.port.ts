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
}

export const STORAGE_PORT = Symbol('STORAGE_PORT');
