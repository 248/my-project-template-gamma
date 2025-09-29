/**
 * Supabase Adapter Factory
 * 環境変数に応じて実際のアダプタまたはモックアダプタを生成
 */

import { SupabaseAdapterImpl } from './supabase-adapter';
import { MockSupabaseAdapter } from './mock-supabase-adapter';
import type { SupabaseAdapter, SupabaseConfig } from './types';

export class SupabaseAdapterFactory {
  private static mockInstance: MockSupabaseAdapter | null = null;

  /**
   * 環境変数に応じてSupabaseAdapterを作成する
   */
  static create(env?: Record<string, unknown>): SupabaseAdapter {
    const useMock =
      (env?.USE_MOCK_SUPABASE || process.env.USE_MOCK_SUPABASE) === 'true';

    if (useMock) {
      // テスト環境では同じインスタンスを再利用
      if (!this.mockInstance) {
        this.mockInstance = new MockSupabaseAdapter();
      }
      return this.mockInstance;
    }

    const config: SupabaseConfig = {
      url: (env?.SUPABASE_URL as string) || process.env.SUPABASE_URL || '',
      anonKey:
        (env?.SUPABASE_ANON_KEY as string) ||
        process.env.SUPABASE_ANON_KEY ||
        '',
      serviceRoleKey:
        (env?.SUPABASE_SERVICE_ROLE_KEY as string) ||
        process.env.SUPABASE_SERVICE_ROLE_KEY,
    };

    // 必須設定の検証
    if (!config.url || !config.anonKey) {
      throw new Error(
        'Supabase configuration is missing. Please set SUPABASE_URL and SUPABASE_ANON_KEY environment variables, or set USE_MOCK_SUPABASE=true for development.'
      );
    }

    return new SupabaseAdapterImpl(config);
  }

  /**
   * テスト用のモックアダプタを作成する
   */
  static createMock(options?: {
    shouldFailPing?: boolean;
  }): MockSupabaseAdapter {
    return new MockSupabaseAdapter(options);
  }

  /**
   * テスト用のモックインスタンスをリセットする
   */
  static resetMockInstance(): void {
    this.mockInstance = null;
  }
}
