import { NextRequest, NextResponse } from 'next/server';

/**
 * Next.js Middleware
 * 認証チェックとTraceContextの処理を行う
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // TraceContext の処理
  const traceparent = request.headers.get('traceparent');
  const response = NextResponse.next();

  // TraceContext がない場合は新規生成
  if (!traceparent) {
    const traceId = crypto.randomUUID().replace(/-/g, '').substring(0, 32);
    const spanId = crypto.randomUUID().replace(/-/g, '').substring(0, 16);
    const newTraceparent = `00-${traceId}-${spanId}-01`;

    response.headers.set('traceparent', newTraceparent);
  }

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
      const loginUrl = new URL('/auth/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }

    // 環境変数でモック/実際のSupabaseを切り替え
    const useMock = process.env.USE_MOCK_SUPABASE === 'true';

    if (useMock) {
      // モック実装: mock-access-token以外は無効とする
      if (accessToken !== 'mock-access-token') {
        const loginUrl = new URL('/auth/login', request.url);
        loginUrl.searchParams.set('redirect', pathname);
        loginUrl.searchParams.set('error', 'invalid_token');
        return NextResponse.redirect(loginUrl);
      }
    } else {
      // 実際のSupabase Auth実装
      // TODO: Supabase Adapterを使用してトークン検証を実装
    }

    console.log(`Authenticated access to protected path: ${pathname}`);
  }

  return response;
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
