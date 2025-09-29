/**
 * Storage Adapter Factory
 * 環境変数に応じて適切なStorageAdapterを生成
 */

import { SupabaseStorageAdapter } from './supabase-storage-adapter';
import { MockStorageAdapter } from './mock-storage-adapter';
import type { StorageAdapter, StorageConfig } from './types';

export class StorageFactory {
  /**
   * 環境変数に応じてStorageAdapterを作成する
   */
  static create(env?: Record<string, unknown>): StorageAdapter {
    const useMock =
      (env?.USE_MOCK_STORAGE || process.env.USE_MOCK_STORAGE) === 'true';

    if (useMock) {
      return new MockStorageAdapter();
    }

    const config: StorageConfig = {
      type: 'supabase', // 現在はSupabaseのみサポート
      supabase: {
        url: (env?.SUPABASE_URL as string) || process.env.SUPABASE_URL || '',
        serviceRoleKey:
          (env?.SUPABASE_SERVICE_ROLE_KEY as string) ||
          process.env.SUPABASE_SERVICE_ROLE_KEY ||
          '',
      },
    };

    // 必須設定の検証
    if (!config.supabase?.url || !config.supabase?.serviceRoleKey) {
      throw new Error(
        'Supabase Storage configuration is missing. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables, or set USE_MOCK_STORAGE=true for development.'
      );
    }

    return new SupabaseStorageAdapter(config);
  }

  /**
   * テスト用のモックアダプタを作成する
   */
  static createMock(options?: {
    shouldFailPing?: boolean;
  }): MockStorageAdapter {
    return new MockStorageAdapter(options);
  }
}
