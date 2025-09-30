/**
 * Supabase Storage Adapter
 * 要件 11.1: 初期実装として Supabase Storage の専用バケットに userId 紐付けで保存する
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { StorageAdapter, StorageFile, StorageConfig } from './types';

export class SupabaseStorageAdapter implements StorageAdapter {
  private client: SupabaseClient;

  constructor(config: StorageConfig) {
    if (!config.supabase) {
      throw new Error('Supabase configuration is required');
    }

    this.client = createClient(
      config.supabase.url,
      config.supabase.serviceRoleKey
    );
  }

  async ping(): Promise<boolean> {
    try {
      // バケット一覧を取得してヘルスチェック
      const { error } = await this.client.storage.listBuckets();
      return !error;
    } catch {
      return false;
    }
  }

  async uploadFile(
    bucket: string,
    path: string,
    file: File | Buffer,
    contentType?: string
  ): Promise<string> {
    const { data, error } = await this.client.storage
      .from(bucket)
      .upload(path, file, {
        contentType,
        upsert: true,
      });

    if (error) {
      throw new Error(`Failed to upload file: ${error.message}`);
    }

    return data.path;
  }

  async getSignedUrl(
    bucket: string,
    path: string,
    expiresIn: number = 3600
  ): Promise<string> {
    const { data, error } = await this.client.storage
      .from(bucket)
      .createSignedUrl(path, expiresIn);

    if (error) {
      throw new Error(`Failed to create signed URL: ${error.message}`);
    }

    return data.signedUrl;
  }

  async deleteFile(bucket: string, path: string): Promise<void> {
    const { error } = await this.client.storage.from(bucket).remove([path]);

    if (error) {
      throw new Error(`Failed to delete file: ${error.message}`);
    }
  }

  async createBucket(bucket: string): Promise<void> {
    const { error } = await this.client.storage.createBucket(bucket, {
      public: false,
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
      fileSizeLimit: 10 * 1024 * 1024, // 10MB
    });

    if (error && error.message !== 'Bucket already exists') {
      throw new Error(`Failed to create bucket: ${error.message}`);
    }
  }

  async listFiles(bucket: string, prefix?: string): Promise<StorageFile[]> {
    const { data, error } = await this.client.storage
      .from(bucket)
      .list(prefix || '', {
        limit: 100,
        sortBy: { column: 'created_at', order: 'desc' },
      });

    if (error) {
      throw new Error(`Failed to list files: ${error.message}`);
    }

    return data.map((file) => ({
      name: file.name,
      size: file.metadata?.size || 0,
      lastModified: new Date(file.updated_at || file.created_at),
      contentType: file.metadata?.mimetype,
    }));
  }
}
