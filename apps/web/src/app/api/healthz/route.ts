import { NextRequest } from 'next/server';
import { createLogger } from '@template-gamma/adapters';

/**
 * Liveness check endpoint
 * 依存関係に触れない軽量チェック（要件12.1）
 */
export async function GET(request: NextRequest) {
  try {
    const response = {
      status: 'ok' as const,
      timestamp: new Date().toISOString(),
      version: process.env.APP_VERSION || '1.0.0',
      commit: process.env.GIT_COMMIT || 'unknown',
      buildTime: process.env.BUILD_TIME || new Date().toISOString(),
    };

    return Response.json(response, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error) {
    // 構造化ログでエラーを記録
    const logger = createLogger();
    logger.error({ err: error }, 'Liveness check failed');

    return Response.json(
      {
        status: 'down',
        timestamp: new Date().toISOString(),
        error: 'Internal server error',
      },
      { status: 500 }
    );
  }
}
