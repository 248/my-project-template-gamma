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
    // TODO: 実際の認証チェックは後のタスクで実装
    // 現在はモック実装として、認証チェックをスキップ
    console.log(`Protected path accessed: ${pathname}`);
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
