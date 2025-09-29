import { NextRequest } from 'next/server';

/**
 * Diagnostics check endpoint
 * 詳細診断情報を提供、認証必須（要件12.3）
 */
export async function GET(request: NextRequest) {
  try {
    // 認証チェック（モック実装）
    const authHeader = request.headers.get('authorization');
    const cookieHeader = request.headers.get('cookie');

    // 簡易認証チェック（開発用）
    let isAuthenticated = false;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      isAuthenticated = true; // 開発用：任意のBearerトークンで認証成功
    } else if (cookieHeader && cookieHeader.includes('auth-token')) {
      isAuthenticated = true; // 開発用：auth-tokenクッキーがあれば認証成功
    }

    if (!isAuthenticated) {
      return Response.json(
        {
          code: 'AUTH_REQUIRED',
          message: 'Authentication required for diagnostics endpoint',
        },
        { status: 401 }
      );
    }

    // モック実装：詳細診断情報
    const dependencies = [
      {
        name: 'supabase',
        status: 'ok' as const,
        latency: 45,
      },
      {
        name: 'storage',
        status: 'ok' as const,
        latency: 32,
      },
    ];

    const result = {
      status: 'ok' as const,
      dependencies,
      version: process.env.APP_VERSION || '1.0.0',
      commit: process.env.GIT_COMMIT || 'unknown',
      buildTime: process.env.BUILD_TIME || new Date().toISOString(),
      timestamp: new Date().toISOString(),
      details: {
        uptime: process.uptime(),
        memory: process.memoryUsage
          ? {
              used: process.memoryUsage().heapUsed,
              total: process.memoryUsage().heapTotal,
            }
          : undefined,
        environment: process.env.NODE_ENV || 'unknown',
      },
    };

    return Response.json(result, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error) {
    console.error('Diagnostics check failed:', error);

    return Response.json(
      {
        status: 'down',
        dependencies: [],
        version: process.env.APP_VERSION || '1.0.0',
        commit: process.env.GIT_COMMIT || 'unknown',
        buildTime: process.env.BUILD_TIME || new Date().toISOString(),
        timestamp: new Date().toISOString(),
        error: 'Internal server error',
      },
      { status: 503 }
    );
  }
}
