/**
 * Storage Adapter 型定義
 * 要件 11.1-11.5: 画像保存の段階的方針
 */

export interface UploadOptions {
  contentType?: string;
  metadata?: Record<string, string>;
}

export interface GetSignedUrlOptions {
  expiresIn?: number;
}

export interface StorageAdapter {
  // ヘルスチェック
  ping(): Promise<boolean>;

  // ファイル操作
  uploadFile(
    bucket: string,
    path: string,
    file: File | Buffer | ArrayBuffer,
    options?: UploadOptions
  ): Promise<string>;
  getSignedUrl(
    bucket: string,
    path: string,
    options?: GetSignedUrlOptions
  ): Promise<string>;
  deleteFile(bucket: string, path: string): Promise<void>;

  // バケット操作
  createBucket(bucket: string): Promise<void>;
  listFiles(bucket: string, prefix?: string): Promise<StorageFile[]>;
}

export interface StorageFile {
  name: string;
  size: number;
  lastModified: Date;
  contentType?: string;
}

export interface StorageConfig {
  type: 'supabase' | 'cloudflare-images' | 'mock';
  supabase?: {
    url: string;
    serviceRoleKey: string;
  };
  cloudflareImages?: {
    accountId: string;
    apiToken: string;
  };
}

export const STORAGE_BUCKETS = {
  USER_IMAGES: 'user-images',
} as const;

export type StorageBucket =
  (typeof STORAGE_BUCKETS)[keyof typeof STORAGE_BUCKETS];

// 型エクスポート
export type { UploadOptions, GetSignedUrlOptions };
