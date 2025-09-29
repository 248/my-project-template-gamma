import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createLogger } from '@template-gamma/adapters';

/**
 * OAuth ログイン開始エンドポイント
 * GET /api/auth/login?provider=github|google
 */
export async function GET(request: NextRequest) {
  try {
    const logger = createLogger();
    const { searchParams } = new URL(request.url);
    const provider = searchParams.get('provider') || 'google';

    // CSRF対策: stateパラメータを生成
    const state = crypto.randomUUID();
    const cookieStore = await cookies();

    // stateをセキュアなCookieに保存
    cookieStore.set('oauth-state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 10, // 10分間
      path: '/',
    });

    // 環境変数でモック/実際のSupabaseを切り替え
    const useMock = process.env.USE_MOCK_SUPABASE === 'true';

    logger.debug(
      {
        provider,
        USE_MOCK_SUPABASE: process.env.USE_MOCK_SUPABASE,
        useMock,
        NODE_ENV: process.env.NODE_ENV,
        state,
      },
      'Login API Debug'
    );

    if (useMock) {
      // モック実装: コールバックページに直接リダイレクト
      const callbackUrl = new URL('/auth/callback', request.url);
      callbackUrl.searchParams.set('code', 'mock-auth-code');
      callbackUrl.searchParams.set('provider', provider);
      callbackUrl.searchParams.set('state', state);

      return NextResponse.redirect(callbackUrl);
    }

    // 実際のSupabase Auth実装
    const redirectUrl = new URL('/auth/callback', request.url).toString();

    // Supabase OAuth URL生成（実装例）
    const supabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL ||
      process.env.SUPABASE_URL ||
      'https://pnwayqbjnsgushowdios.supabase.co'; // フォールバック

    logger.debug(
      {
        SUPABASE_URL: process.env.SUPABASE_URL,
        NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
        supabaseUrl,
      },
      'Environment variables check'
    );

    const authUrl = `${supabaseUrl}/auth/v1/authorize?provider=${provider}&redirect_to=${encodeURIComponent(redirectUrl)}&state=${state}`;

    return NextResponse.redirect(authUrl);
  } catch (error) {
    const logger = createLogger();
    logger.error({ err: error }, 'Login initiation failed');

    return NextResponse.json(
      {
        code: 'AUTH_INITIATION_FAILED',
        message: 'ログインの開始に失敗しました',
      },
      { status: 500 }
    );
  }
}
