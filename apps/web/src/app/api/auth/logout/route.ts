import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

/**
 * ログアウト処理エンドポイント
 * POST /api/auth/logout
 */
export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();

    // セッションCookieを削除
    cookieStore.delete('sb-access-token');
    cookieStore.delete('sb-refresh-token');

    // 環境変数でモック/実際のSupabaseを切り替え
    const useMock = process.env.USE_MOCK_SUPABASE === 'true';

    if (useMock) {
      console.log('Mock user session cleared');
    } else {
      // 実際のSupabase Auth実装
      // TODO: Supabase Auth APIを使用してセッション無効化を実装
    }

    return NextResponse.json({
      success: true,
      message: 'ログアウトしました',
    });
  } catch (error) {
    console.error('Logout failed:', error);

    return NextResponse.json(
      {
        code: 'LOGOUT_FAILED',
        message: 'ログアウトに失敗しました',
      },
      { status: 500 }
    );
  }
}
