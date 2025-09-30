/**
 * APIエラーハンドリングミドルウェア
 * 要件 5.5: API エラーが発生した時 THEN システムはコード + メッセージ形式で返却する
 * 要件 5.6: エラーコードが定義される時 THEN システムは packages/contracts/error-codes.ts に一元管理する
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { Logger } from '@template-gamma/adapters';
import {
  ERROR_CODES,
  createApiError,
  getStatusFromErrorCode,
} from '@template-gamma/contracts/error-codes';
import { ValidationError } from '../validation/validation-error-handler';
import { BffError, AuthError, AuthorizationError } from '../error-handler';

/**
 * APIハンドラーの型定義
 */
export type ApiHandler = (request: NextRequest) => Promise<Response>;

/**
 * エラーハンドリングミドルウェアのオプション
 */
export interface ErrorMiddlewareOptions {
  logger?: Logger;
  includeStackTrace?: boolean;
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
}

/**
 * APIエラーハンドリングミドルウェア
 */
export class ErrorMiddleware {
  constructor(private options: ErrorMiddlewareOptions = {}) {}

  /**
   * APIハンドラーをエラーハンドリングでラップする
   */
  wrap(handler: ApiHandler): ApiHandler {
    return async (request: NextRequest): Promise<Response> => {
      try {
        return await handler(request);
      } catch (error) {
        return this.handleError(error, request);
      }
    };
  }

  /**
   * エラーを適切なHTTPレスポンスに変換する
   */
  private handleError(error: unknown, request: NextRequest): Response {
    const { logger, includeStackTrace = false } = this.options;

    // リクエスト情報
    const requestInfo = {
      method: request.method,
      url: request.url,
      userAgent: request.headers.get('user-agent'),
      userId: request.headers.get('x-user-id'),
    };

    // バリデーションエラー
    if (error instanceof ValidationError) {
      logger?.warn(
        {
          ...requestInfo,
          errors: error.errors,
        },
        'Validation error occurred'
      );

      return Response.json(error.toApiError(), { status: 422 });
    }

    // BFFエラー（予期されたビジネスロジックエラー）
    if (error instanceof BffError) {
      const status = getStatusFromErrorCode(error.code);
      const apiError = createApiError(error.code, error.message, error.details);

      // 認証・認可エラーは警告レベル
      if (error instanceof AuthError || error instanceof AuthorizationError) {
        logger?.warn(
          {
            ...requestInfo,
            code: error.code,
            message: error.message,
          },
          'Authentication/Authorization error'
        );
      }
      // その他のBFFエラーは情報レベル
      else {
        logger?.info(
          {
            ...requestInfo,
            code: error.code,
            message: error.message,
            details: error.details,
          },
          'Business logic error'
        );
      }

      return Response.json(apiError, { status });
    }

    // Zodエラー（直接的なZodエラー）
    if (error instanceof z.ZodError) {
      const validationError = ValidationError.fromZodError(error);

      logger?.warn(
        {
          ...requestInfo,
          errors: validationError.errors,
        },
        'Zod validation error occurred'
      );

      return Response.json(validationError.toApiError(), { status: 422 });
    }

    // 標準的なJavaScriptエラー
    if (error instanceof Error) {
      logger?.error(
        {
          ...requestInfo,
          err: error,
          stack: includeStackTrace ? error.stack : undefined,
        },
        'Unhandled error occurred'
      );

      // 開発環境では詳細なエラー情報を返す
      if (process.env.NODE_ENV === 'development' && includeStackTrace) {
        return Response.json(
          createApiError(ERROR_CODES.INTERNAL_ERROR, error.message, {
            stack: error.stack,
            name: error.name,
          }),
          { status: 500 }
        );
      }

      return Response.json(createApiError(ERROR_CODES.INTERNAL_ERROR), {
        status: 500,
      });
    }

    // 不明なエラー
    logger?.error(
      {
        ...requestInfo,
        error:
          typeof error === 'object' ? JSON.stringify(error) : String(error),
      },
      'Unknown error occurred'
    );

    return Response.json(
      createApiError(ERROR_CODES.INTERNAL_ERROR, 'An unknown error occurred'),
      { status: 500 }
    );
  }
}

/**
 * デフォルトのエラーミドルウェアインスタンス
 */
export const defaultErrorMiddleware = new ErrorMiddleware({
  includeStackTrace: process.env.NODE_ENV === 'development',
  logLevel: 'error',
});

/**
 * エラーハンドリング付きのAPIハンドラーを作成するヘルパー関数
 */
export function withErrorHandling(
  handler: ApiHandler,
  options?: ErrorMiddlewareOptions
): ApiHandler {
  const middleware = new ErrorMiddleware(options);
  return middleware.wrap(handler);
}

/**
 * 複数のミドルウェアを組み合わせるヘルパー関数
 */
export function composeMiddleware(
  ...middlewares: Array<(handler: ApiHandler) => ApiHandler>
): (handler: ApiHandler) => ApiHandler {
  return (handler: ApiHandler) => {
    return middlewares.reduceRight(
      (acc, middleware) => middleware(acc),
      handler
    );
  };
}

/**
 * 認証チェック付きのエラーハンドリングミドルウェア
 */
export function withAuthAndErrorHandling(
  handler: ApiHandler,
  options?: ErrorMiddlewareOptions
): ApiHandler {
  return withErrorHandling(async (request: NextRequest) => {
    // 認証チェック（簡易版 - 実際の実装では middleware で処理）
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      throw new AuthError(ERROR_CODES.AUTH_REQUIRED, 'Authentication required');
    }

    return handler(request);
  }, options);
}

/**
 * CORS対応付きのエラーハンドリングミドルウェア
 */
export function withCorsAndErrorHandling(
  handler: ApiHandler,
  corsOptions: {
    origin?: string | string[];
    methods?: string[];
    headers?: string[];
  } = {},
  errorOptions?: ErrorMiddlewareOptions
): ApiHandler {
  const {
    origin = '*',
    methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    headers = ['Content-Type', 'Authorization', 'X-User-ID'],
  } = corsOptions;

  return withErrorHandling(async (request: NextRequest) => {
    // OPTIONSリクエストの処理
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': Array.isArray(origin)
            ? origin.join(', ')
            : origin,
          'Access-Control-Allow-Methods': methods.join(', '),
          'Access-Control-Allow-Headers': headers.join(', '),
          'Access-Control-Max-Age': '86400',
        },
      });
    }

    // 実際のリクエスト処理
    const response = await handler(request);

    // CORSヘッダーを追加
    const corsHeaders = new Headers(response.headers);
    corsHeaders.set(
      'Access-Control-Allow-Origin',
      Array.isArray(origin) ? origin.join(', ') : origin
    );
    corsHeaders.set('Access-Control-Allow-Methods', methods.join(', '));
    corsHeaders.set('Access-Control-Allow-Headers', headers.join(', '));

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: corsHeaders,
    });
  }, errorOptions);
}

/**
 * レート制限付きのエラーハンドリングミドルウェア
 */
export function withRateLimitAndErrorHandling(
  handler: ApiHandler,
  rateLimitOptions: {
    maxRequests: number;
    windowMs: number;
    keyGenerator?: (request: NextRequest) => string;
  },
  errorOptions?: ErrorMiddlewareOptions
): ApiHandler {
  const {
    maxRequests,
    windowMs,
    keyGenerator = (req) => req.headers.get('x-forwarded-for') || 'anonymous',
  } = rateLimitOptions;
  const requestCounts = new Map<string, { count: number; resetTime: number }>();

  return withErrorHandling(async (request: NextRequest) => {
    const key = keyGenerator(request);
    const now = Date.now();
    const windowStart = now - windowMs;

    // 古いエントリをクリーンアップ
    for (const [k, v] of requestCounts.entries()) {
      if (v.resetTime < windowStart) {
        requestCounts.delete(k);
      }
    }

    // 現在のリクエスト数をチェック
    const current = requestCounts.get(key);
    if (
      current &&
      current.count >= maxRequests &&
      current.resetTime > windowStart
    ) {
      throw new BffError(ERROR_CODES.RATE_LIMIT_EXCEEDED, 'Too many requests', {
        maxRequests,
        windowMs,
        resetTime: current.resetTime,
      });
    }

    // リクエスト数を更新
    if (current && current.resetTime > windowStart) {
      current.count++;
    } else {
      requestCounts.set(key, { count: 1, resetTime: now + windowMs });
    }

    return handler(request);
  }, errorOptions);
}
