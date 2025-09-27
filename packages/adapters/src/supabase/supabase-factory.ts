/**
 * Supabase Adapter Factory
 * 環境変数に応じて実際のアダプタまたはモックアダプタを生成
 */

import { SupabaseAdapterImpl } from './supabase-adapter.js';
import { MockSupabaseAdapter } from './mock-supabase-adapter.js';
import type { SupabaseAdapter, SupabaseConfig } from './types.js';

export class SupabaseFactory {
  /**
   * 環境変数に応じてSupabaseAdapterを作成する
   */
  static create(env?: Record<string, unknown>): SupabaseAdapter {
    const useMock =
      (env?.USE_MOCK_SUPABASE || process.env.USE_MOCK_SUPABASE) === 'true';

    if (useMock) {
      return new MockSupabaseAdapter();
    }

    const config: SupabaseConfig = {
      url: env?.SUPABASE_URL || process.env.SUPABASE_URL || '',
      anonKey: env?.SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '',
      serviceRoleKey:
        env?.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY,
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
}
