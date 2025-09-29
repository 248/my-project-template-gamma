import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createSupabaseAdapter, createLogger } from '@template-gamma/adapters';

/**
 * ログアウト処理エンドポイント
 * POST /api/auth/logout
 */
export async function POST() {
  try {
    const logger = createLogger();
    const cookieStore = await cookies();

    // 現在のアクセストークンを取得
    const accessToken = cookieStore.get('sb-access-token')?.value;

    // 環境変数でモック/実際のSupabaseを切り替え
    const useMock = process.env.USE_MOCK_SUPABASE === 'true';

    if (useMock) {
      logger.info('Mock user session cleared');
    } else {
      // 実際のSupabase Auth実装: サーバーサイドでセッション無効化
      if (accessToken) {
        try {
          const supabaseAdapter = createSupabaseAdapter();
          await supabaseAdapter.signOut(accessToken);
          logger.info('Server-side session invalidated');
        } catch (signOutError) {
          logger.warn(
            { err: signOutError },
            'Failed to invalidate server-side session'
          );
          // クライアント側のクッキー削除は続行
        }
      }
    }

    // セッションCookieを削除
    cookieStore.delete('sb-access-token');
    cookieStore.delete('sb-refresh-token');

    return NextResponse.json({
      success: true,
      message: 'ログアウトしました',
    });
  } catch (error) {
    const logger = createLogger();
    logger.error({ err: error }, 'Logout failed');

    return NextResponse.json(
      {
        code: 'LOGOUT_FAILED',
        message: 'ログアウトに失敗しました',
      },
      { status: 500 }
    );
  }
}
