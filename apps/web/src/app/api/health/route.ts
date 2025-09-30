import { NextRequest } from 'next/server';
import {
  LoggerFactory,
  ErrorLogger,
  withTraceContext,
} from '@template-gamma/adapters';

/**
 * Health check endpoint (JSON format)
 * 要件1.2: JSON形式でヘルスチェック結果を返却
 * 要件 7.2, 13.1: 構造化ログとTraceContext統合
 */
async function healthHandler(request: NextRequest) {
  const logger = LoggerFactory.createDefault();
  const errorLogger = new ErrorLogger(logger);

  try {
    logger.info('Health check started');

    // モック実装：Supabase接続確認を含む（要件1.3）
    const startTime = Date.now();

    // 依存関係チェック（モック）
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

    const duration = Date.now() - startTime;
    logger.info(
      {
        status: result.status,
        dependencyCount: dependencies.length,
        duration,
      },
      'Health check completed successfully'
    );

    return Response.json(result, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error) {
    // 要件 7.4: logger.error({ err }, 'unhandled error') 形式
    errorLogger.logUnhandledError(error, {
      endpoint: '/api/health',
      method: request.method,
    });

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

// TraceContext統合（要件 13.1, 13.4）
export const GET = withTraceContext(healthHandler);
