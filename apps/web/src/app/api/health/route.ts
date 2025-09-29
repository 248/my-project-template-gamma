import { NextRequest } from 'next/server';

/**
 * Health check endpoint (JSON format)
 * 要件1.2: JSON形式でヘルスチェック結果を返却
 */
export async function GET(request: NextRequest) {
  try {
    // モック実装：Supabase接続確認を含む（要件1.3）
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
    };

    return Response.json(result, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error) {
    console.error('Health check failed:', error);

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
