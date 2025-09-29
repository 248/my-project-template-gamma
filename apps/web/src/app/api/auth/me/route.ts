import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

/**
 * 現在のユーザー情報取得エンドポイント
 * GET /api/auth/me
 */
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('sb-access-token')?.value;

    if (!accessToken) {
      return NextResponse.json(
        {
          code: 'AUTH_REQUIRED',
          message: '認証が必要です',
        },
        { status: 401 }
      );
    }

    // 環境変数でモック/実際のSupabaseを切り替え
    const useMock = process.env.USE_MOCK_SUPABASE === 'true';

    if (useMock) {
      // モック実装
      if (accessToken === 'mock-access-token') {
        return NextResponse.json({
          user: {
            id: 'mock-user-id',
            email: 'test@example.com',
            lastLoginAt: new Date().toISOString(),
          },
        });
      } else {
        return NextResponse.json(
          {
            code: 'AUTH_INVALID_TOKEN',
            message: '無効なトークンです',
          },
          { status: 401 }
        );
      }
    }

    // 実際のSupabase Auth実装
    // TODO: Supabase Adapterを使用してユーザー情報を取得

    return NextResponse.json({
      user: {
        id: 'real-user-id',
        email: 'real@example.com',
        lastLoginAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('User info retrieval failed:', error);

    return NextResponse.json(
      {
        code: 'INTERNAL_ERROR',
        message: 'ユーザー情報の取得に失敗しました',
      },
      { status: 500 }
    );
  }
}
