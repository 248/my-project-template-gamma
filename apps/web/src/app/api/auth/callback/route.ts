import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createLogger } from '@template-gamma/adapters';

/**
 * OAuth コールバック処理エンドポイント
 * GET /api/auth/callback?code=xxx&provider=xxx&state=xxx
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const provider = searchParams.get('provider') || 'google';
    const state = searchParams.get('state');

    if (!code) {
      return NextResponse.redirect(
        new URL('/auth/login?error=missing_code', request.url)
      );
    }

    // CSRF対策: stateパラメータの検証
    const cookieStore = await cookies();
    const storedState = cookieStore.get('oauth-state')?.value;

    if (!state || !storedState || state !== storedState) {
      return NextResponse.redirect(
        new URL('/auth/login?error=invalid_state', request.url)
      );
    }

    // stateクッキーを削除（使い捨て）
    cookieStore.delete('oauth-state');

    // 環境変数でモック/実際のSupabaseを切り替え
    const useMock = process.env.USE_MOCK_SUPABASE === 'true';

    // 構造化ログでデバッグ情報を記録
    const logger = createLogger();
    logger.debug(
      {
        code,
        provider,
        USE_MOCK_SUPABASE: process.env.USE_MOCK_SUPABASE,
        NODE_ENV: process.env.NODE_ENV,
        useMock,
      },
      'Callback API Debug'
    );

    if (useMock) {
      // モック実装: セッションCookieを設定
      const mockSession = {
        access_token: 'mock-access-token',
        refresh_token: 'mock-refresh-token',
        user: {
          id: 'mock-user-id',
          email: 'test@example.com',
        },
      };

      const cookieStore = await cookies();

      // セッションCookieを設定（HttpOnly, Secure, SameSite=Lax）
      cookieStore.set('sb-access-token', mockSession.access_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7, // 7日間
        path: '/',
      });

      cookieStore.set('sb-refresh-token', mockSession.refresh_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 30, // 30日間
        path: '/',
      });

      // ユーザー情報をDBに保存（モック）
      logger.info({ user: mockSession.user }, 'Mock user session created');
      logger.info('Cookies set, redirecting to /home');

      return NextResponse.redirect(new URL('/home', request.url));
    }

    // 実際のSupabase Auth実装
    // TODO: Supabase Auth APIを使用してトークン交換を実装

    return NextResponse.redirect(new URL('/home', request.url));
  } catch (error) {
    // 構造化ログでエラーを記録
    const logger = createLogger();
    logger.error({ err: error }, 'Callback processing failed');

    return NextResponse.redirect(
      new URL('/auth/login?error=callback_failed', request.url)
    );
  }
}
