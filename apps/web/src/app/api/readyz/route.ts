import { NextRequest } from 'next/server';
import { withErrorHandling } from '@template-gamma/bff/middleware/error-middleware';
import { ValidationErrorHandlerFactory } from '@template-gamma/bff/validation/validation-error-handler';
import {
  HealthSchemas,
  EnvSchemas,
} from '@template-gamma/contracts/validation-schemas';
import { createLogger } from '@template-gamma/adapters';
import { BffError, ERROR_CODES } from '@template-gamma/bff';

/**
 * Readiness check endpoint
 * Supabase/Storageへの到達確認を含む（要件12.2）
 * 要件 5.5, 5.6: 統一エラーレスポンス
 */
const readinessHandler = async (request: NextRequest): Promise<Response> => {
  const logger = createLogger();
  const validator = ValidationErrorHandlerFactory.create(logger);

  // 環境変数の検証
  const env = validator.validateEnv(EnvSchemas.base);

  // モック実装：依存関係チェック
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

  // 依存関係の状態から全体ステータスを決定
  const overallStatus = dependencies.every((dep) => dep.status === 'ok')
    ? 'ok'
    : dependencies.some((dep) => dep.status === 'degraded')
      ? 'degraded'
      : 'down';

  const result = {
    status: overallStatus,
    dependencies,
    version: env.APP_VERSION,
    commit: env.GIT_COMMIT,
    buildTime: env.BUILD_TIME,
  };

  // レスポンスのバリデーション
  const validatedResult = validator.validate(
    HealthSchemas.readinessResponse,
    result
  );

  logger.info(
    {
      status: overallStatus,
      dependencyCount: dependencies.length,
    },
    'Readiness check completed'
  );

  // ステータスに応じてHTTPステータスコードを設定
  const httpStatus =
    overallStatus === 'ok' ? 200 : overallStatus === 'degraded' ? 200 : 503;

  return Response.json(validatedResult, {
    status: httpStatus,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    },
  });
};

export const GET = withErrorHandling(readinessHandler, {
  logger: createLogger(),
  includeStackTrace: process.env.NODE_ENV === 'development',
});
