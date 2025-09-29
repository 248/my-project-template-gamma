import { NextRequest, NextResponse } from 'next/server';

/**
 * OAuth ログイン開始エンドポイント
 * GET /api/auth/login?provider=github|google
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const provider = searchParams.get('provider') || 'google';

    // 環境変数でモック/実際のSupabaseを切り替え
    const useMock = process.env.USE_MOCK_SUPABASE === 'true';

    console.log('Login API Debug:', {
      provider,
      USE_MOCK_SUPABASE: process.env.USE_MOCK_SUPABASE,
      useMock,
      NODE_ENV: process.env.NODE_ENV,
      SUPABASE_URL: process.env.SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    });

    if (useMock) {
      // モック実装: コールバックページに直接リダイレクト
      const callbackUrl = new URL('/auth/callback', request.url);
      callbackUrl.searchParams.set('code', 'mock-auth-code');
      callbackUrl.searchParams.set('provider', provider);

      return NextResponse.redirect(callbackUrl);
    }

    // 実際のSupabase Auth実装
    const redirectUrl = new URL('/auth/callback', request.url).toString();

    // Supabase OAuth URL生成（実装例）
    const supabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL ||
      process.env.SUPABASE_URL ||
      'https://pnwayqbjnsgushowdios.supabase.co'; // フォールバック

    console.log('Environment variables check:', {
      SUPABASE_URL: process.env.SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
      supabaseUrl,
    });

    const authUrl = `${supabaseUrl}/auth/v1/authorize?provider=${provider}&redirect_to=${encodeURIComponent(redirectUrl)}`;

    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error('Login initiation failed:', error);

    return NextResponse.json(
      {
        code: 'AUTH_INITIATION_FAILED',
        message: 'ログインの開始に失敗しました',
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
