/**
 * Next.js Middleware用のTraceContext統合
 * 要件 13.1, 13.4: TraceContext の生成・継承とログへの自動付与
 */

import { NextRequest, NextResponse } from 'next/server';
import { TraceContext } from '../trace-context';
import { LoggerFactory, ErrorLogger } from '../logger';

export interface TraceMiddlewareConfig {
  /**
   * TraceContextを設定するパスのパターン
   * デフォルト: すべてのパス
   */
  pathPattern?: RegExp;

  /**
   * ログを出力するかどうか
   * デフォルト: true
   */
  enableLogging?: boolean;

  /**
   * レスポンスヘッダーにtraceparentを含めるかどうか
   * デフォルト: true
   */
  includeResponseHeaders?: boolean;
}

/**
 * Next.js Middleware でTraceContextを設定する
 */
export function createTraceMiddleware(config: TraceMiddlewareConfig = {}) {
  const {
    pathPattern = /.*/,
    enableLogging = true,
    includeResponseHeaders = true,
  } = config;

  return async function traceMiddleware(request: NextRequest) {
    // パスパターンのチェック
    if (!pathPattern.test(request.nextUrl.pathname)) {
      return NextResponse.next();
    }

    // TraceContextを作成
    const traceparent = request.headers.get('traceparent') || undefined;
    const requestContext = TraceContext.createRequestContext(traceparent);

    // ログ出力
    if (enableLogging) {
      const logger = LoggerFactory.createDefault();
      const errorLogger = new ErrorLogger(logger);

      try {
        logger.info(
          {
            method: request.method,
            url: request.url,
            userAgent: request.headers.get('user-agent'),
            ip: request.ip || request.headers.get('x-forwarded-for'),
          },
          'Request started'
        );

        // レスポンス処理
        const response = NextResponse.next();

        // レスポンスヘッダーにtraceparentを追加
        if (includeResponseHeaders) {
          const traceparentHeader = TraceContext.generateTraceparent(
            requestContext.traceInfo
          );
          response.headers.set('traceparent', traceparentHeader);
          response.headers.set('x-request-id', requestContext.requestId);
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
        // エラーログ
        errorLogger.logUnhandledError(error, {
          method: request.method,
          url: request.url,
        });

        throw error;
      } finally {
        // リクエスト終了時にコンテキストをクリア
        // 注意: Next.js Middlewareでは各リクエストが独立しているため、
        // 実際のクリアは不要だが、明示的に行う
        TraceContext.clearRequestContext();
      }
    }

    const response = NextResponse.next();

    if (includeResponseHeaders) {
      const traceparentHeader = TraceContext.generateTraceparent(
        requestContext.traceInfo
      );
      response.headers.set('traceparent', traceparentHeader);
      response.headers.set('x-request-id', requestContext.requestId);
    }

    return response;
  };
}

/**
 * API Routes用のTraceContext設定ヘルパー
 */
export function withTraceContext<T extends (...args: unknown[]) => unknown>(
  handler: T,
  enableLogging = true
): T {
  return (async (...args: Parameters<T>) => {
    const request = args[0] as Request;

    // TraceContextを設定
    const traceparent = request.headers.get('traceparent') || undefined;
    const requestContext = TraceContext.createRequestContext(traceparent);

    if (enableLogging) {
      const logger = LoggerFactory.createDefault();
      logger.info(
        {
          method: request.method,
          url: request.url,
        },
        'API request started'
      );
    }

    try {
      const result = await handler(...args);

      if (enableLogging) {
        const logger = LoggerFactory.createDefault();
        const duration = Date.now() - requestContext.startTime.getTime();
        logger.info(
          {
            method: request.method,
            url: request.url,
            duration,
          },
          'API request completed'
        );
      }

      return result;
    } catch (error) {
      if (enableLogging) {
        const logger = LoggerFactory.createDefault();
        const errorLogger = new ErrorLogger(logger);
        errorLogger.logUnhandledError(error, {
          method: request.method,
          url: request.url,
        });
      }

      throw error;
    } finally {
      TraceContext.clearRequestContext();
    }
  }) as T;
}
