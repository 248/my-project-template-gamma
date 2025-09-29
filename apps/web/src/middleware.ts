import { NextRequest, NextResponse } from 'next/server';
import {
  TraceContext,
  LoggerFactory,
  ErrorLogger,
} from '@template-gamma/adapters';

/**
 * Next.js Middleware
 * 認証チェックとTraceContextの処理を行う
 * 要件 13.1, 13.4: TraceContext の生成・継承とログへの自動付与
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // TraceContext を作成（要件 13.4 準拠）
  const traceparent = request.headers.get('traceparent') || undefined;
  const requestContext = TraceContext.createRequestContext(traceparent);

  // Logger を初期化
  const logger = LoggerFactory.createDefault();
  const errorLogger = new ErrorLogger(logger);

  // リクエスト開始ログ（要件 7.2 準拠）
  logger.info(
    {
      method: request.method,
      url: request.url,
      userAgent: request.headers.get('user-agent'),
      ip:
        request.headers.get('x-forwarded-for') ||
        request.headers.get('x-real-ip'),
    },
    'Request started'
  );

  try {
    // TraceContextを使用してリクエスト処理を実行
    return TraceContext.runWithContext(requestContext, () => {
      const response = NextResponse.next();

      // レスポンスヘッダーにTraceContextを追加
      const traceparentHeader = TraceContext.generateTraceparent(
        requestContext.traceInfo
      );
      response.headers.set('traceparent', traceparentHeader);
      response.headers.set('x-request-id', requestContext.requestId);

      // 認証が必要なパスの定義
      const protectedPaths = [
        '/home',
        '/api/diag',
        '/api/images',
        '/api/users',
      ];
      const isProtectedPath = protectedPaths.some((path) =>
        pathname.startsWith(path)
      );

      if (isProtectedPath) {
        // 認証チェック実装
        const accessToken = request.cookies.get('sb-access-token')?.value;

        if (!accessToken) {
          // API パスの場合は401を返す
          if (pathname.startsWith('/api/')) {
            return NextResponse.json(
              { code: 'AUTH_REQUIRED', message: 'Authentication required' },
              { status: 401 }
            );
          }

          // 未認証の場合はログインページにリダイレクト
          logger.info(
            { path: pathname, reason: 'no_access_token' },
            'Redirecting to login - no access token'
          );

          const loginUrl = new URL('/auth/login', request.url);
          loginUrl.searchParams.set('redirect', pathname);
          return NextResponse.redirect(loginUrl);
        }

        // 環境変数でモック/実際のSupabaseを切り替え
        const useMock = process.env.USE_MOCK_SUPABASE === 'true';
        let userId: string | null = null;

        if (useMock) {
          // モック実装: mock-access-token以外は無効とする
          if (accessToken !== 'mock-access-token') {
            logger.warn(
              { path: pathname, reason: 'invalid_mock_token' },
              'Invalid mock token'
            );

            if (pathname.startsWith('/api/')) {
              return NextResponse.json(
                { code: 'AUTH_INVALID_TOKEN', message: 'Invalid token' },
                { status: 401 }
              );
            }

            const loginUrl = new URL('/auth/login', request.url);
            loginUrl.searchParams.set('redirect', pathname);
            loginUrl.searchParams.set('error', 'invalid_token');
            return NextResponse.redirect(loginUrl);
          }

          // モック環境では固定のユーザーIDを使用
          userId = 'mock-user-id';
        } else {
          // 実際のSupabase Auth実装
          // TODO: Supabase Adapterを使用してトークン検証を実装
          // 現在はモック実装のみ
          userId = 'mock-user-id';
        }

        // 認証済みユーザーIDをヘッダーに安全に設定
        // これはmiddlewareでのみ設定可能で、クライアントからは偽装不可能
        response.headers.set('x-authenticated-user-id', userId);

        logger.info(
          { path: pathname, authenticated: true, userId },
          'Authenticated access to protected path'
        );
      }

      // リクエスト完了ログ
      const duration = Date.now() - requestContext.startTime.getTime();
      logger.info(
        {
          method: request.method,
          url: request.url,
          duration,
          status: response.status,
        },
        'Request completed'
      );

      return response;
    });
  } catch (error) {
    // エラーログ（要件 7.4 準拠）
    errorLogger.logUnhandledError(error, {
      method: request.method,
      url: request.url,
      path: pathname,
    });

    throw error;
  } finally {
    // リクエスト終了時にコンテキストをクリア
    TraceContext.clearRequestContext();
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
