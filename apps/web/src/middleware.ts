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
      ip: request.ip || request.headers.get('x-forwarded-for'),
    },
    'Request started'
  );

  try {
    const response = NextResponse.next();

    // レスポンスヘッダーにTraceContextを追加
    const traceparentHeader = TraceContext.generateTraceparent(
      requestContext.traceInfo
    );
    response.headers.set('traceparent', traceparentHeader);
    response.headers.set('x-request-id', requestContext.requestId);

    // 認証が必要なパスの定義
    const protectedPaths = ['/home', '/api/diag'];
    const isProtectedPath = protectedPaths.some((path) =>
      pathname.startsWith(path)
    );

    if (isProtectedPath) {
      // 認証チェック実装
      const accessToken = request.cookies.get('sb-access-token')?.value;

      if (!accessToken) {
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

      if (useMock) {
        // モック実装: mock-access-token以外は無効とする
        if (accessToken !== 'mock-access-token') {
          logger.warn(
            { path: pathname, reason: 'invalid_mock_token' },
            'Redirecting to login - invalid mock token'
          );

          const loginUrl = new URL('/auth/login', request.url);
          loginUrl.searchParams.set('redirect', pathname);
          loginUrl.searchParams.set('error', 'invalid_token');
          return NextResponse.redirect(loginUrl);
        }
      } else {
        // 実際のSupabase Auth実装
        // TODO: Supabase Adapterを使用してトークン検証を実装
      }

      logger.info(
        { path: pathname, authenticated: true },
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
