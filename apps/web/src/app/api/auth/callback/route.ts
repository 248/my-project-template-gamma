import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

/**
 * OAuth コールバック処理エンドポイント
 * GET /api/auth/callback?code=xxx&provider=xxx
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const provider = searchParams.get('provider') || 'google';

    if (!code) {
      return NextResponse.redirect(
        new URL('/auth/login?error=missing_code', request.url)
      );
    }

    // 環境変数でモック/実際のSupabaseを切り替え
    const useMock = process.env.USE_MOCK_SUPABASE === 'true';

    console.log('Callback API Debug:', {
      code,
      provider,
      USE_MOCK_SUPABASE: process.env.USE_MOCK_SUPABASE,
      NODE_ENV: process.env.NODE_ENV,
      useMock,
    });

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
      console.log('Mock user session created:', mockSession.user);
      console.log('Cookies set, redirecting to /home');

      return NextResponse.redirect(new URL('/home', request.url));
    }

    // 実際のSupabase Auth実装
    // TODO: Supabase Auth APIを使用してトークン交換を実装

    return NextResponse.redirect(new URL('/home', request.url));
  } catch (error) {
    console.error('Callback processing failed:', error);

    return NextResponse.redirect(
      new URL('/auth/login?error=callback_failed', request.url)
    );
  }
}
