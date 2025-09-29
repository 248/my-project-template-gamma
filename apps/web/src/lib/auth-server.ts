import { cookies } from 'next/headers';
import { User } from './auth';
import { createLogger } from '@template-gamma/adapters';

/**
 * サーバーサイド専用の認証ヘルパー関数
 */

/**
 * サーバーサイドで現在のユーザーを取得
 */
export async function getCurrentUser(): Promise<User | null> {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('sb-access-token')?.value;

    if (!accessToken) {
      return null;
    }

    // 環境変数でモック/実際のSupabaseを切り替え
    const useMock = process.env.USE_MOCK_SUPABASE === 'true';

    if (useMock) {
      // モック実装
      if (accessToken === 'mock-access-token') {
        return {
          id: 'mock-user-id',
          email: 'test@example.com',
          lastLoginAt: new Date().toISOString(),
        };
      }
      return null;
    }

    // 実際のSupabase Auth実装
    // TODO: Supabase Adapterを使用してユーザー情報を取得

    return null;
  } catch (error) {
    const logger = createLogger();
    logger.error({ err: error }, 'Failed to get current user');
    return null;
  }
}

/**
 * サーバーサイドで認証状態をチェック
 */
export async function isAuthenticated(): Promise<boolean> {
  const user = await getCurrentUser();
  return user !== null;
}
