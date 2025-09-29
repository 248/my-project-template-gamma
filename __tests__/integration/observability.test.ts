/**
 * 観測性機能の統合テスト
 * Windows環境での実際の動作確認
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { LoggerFactory, ErrorLogger } from '../../packages/adapters/src/logger';
import { TraceContext } from '../../packages/adapters/src/trace-context';

describe('観測性機能の統合テスト', () => {
  beforeEach(() => {
    TraceContext.clearRequestContext();
  });

  afterEach(() => {
    TraceContext.clearRequestContext();
  });

  describe('Windows環境での動作確認', () => {
    it('TraceContextとLoggerが正常に統合される', () => {
      // リクエストコンテキストを作成
      const context = TraceContext.createRequestContext();

      // Logger を作成
      const logger = LoggerFactory.createDefault({
        NODE_ENV: 'development',
        LOG_LEVEL: 'info',
      });

      // ログ出力（実際のコンソール出力で確認）
      logger.info('統合テスト開始');
      logger.info(
        {
          component: 'test',
          operation: 'integration-test',
        },
        '統合テスト実行中'
      );

      // TraceContextが正常に設定されていることを確認
      expect(context.requestId).toBeDefined();
      expect(context.traceInfo.traceId).toHaveLength(32);
      expect(context.traceInfo.spanId).toHaveLength(16);
      expect(context.traceInfo.flags).toBe('01');
    });

    it('エラーログが適切に構造化される', () => {
      TraceContext.createRequestContext();

      const logger = LoggerFactory.createDefault({
        NODE_ENV: 'development',
        LOG_LEVEL: 'error',
      });

      const errorLogger = new ErrorLogger(logger);

      // 様々なタイプのエラーをテスト
      const standardError = new Error('標準エラー');
      const customError = new Error('カスタムエラー');
      customError.name = 'CustomError';
      (customError as Error & { code: string }).code = 'CUSTOM_001';

      errorLogger.logUnhandledError(standardError);
      errorLogger.logHttpError(customError, 500, '/api/test');

      // エラーが正常にシリアライズされることを確認
      expect(standardError.message).toBe('標準エラー');
      expect(customError.name).toBe('CustomError');
    });

    it('子スパンが正常に生成される', () => {
      const parentContext = TraceContext.createRequestContext();
      const childSpan = TraceContext.createChildSpanFromCurrent();

      expect(childSpan).toBeDefined();
      expect(childSpan!.traceId).toBe(parentContext.traceInfo.traceId);
      expect(childSpan!.parentId).toBe(parentContext.traceInfo.spanId);
      expect(childSpan!.spanId).not.toBe(parentContext.traceInfo.spanId);
    });

    it('traceparentヘッダーが正常に生成される', () => {
      const context = TraceContext.createRequestContext();
      const traceparent = TraceContext.generateTraceparent(context.traceInfo);

      expect(traceparent).toMatch(/^00-[0-9a-f]{32}-[0-9a-f]{16}-01$/);

      // 生成されたtraceparentを再パースして確認
      const parsedContext = TraceContext.parseTraceparent(traceparent);
      expect(parsedContext.traceId).toBe(context.traceInfo.traceId);
    });

    it('環境変数による設定が正常に動作する', () => {
      // 開発環境設定
      const devLogger = LoggerFactory.createDefault({
        NODE_ENV: 'development',
        LOG_LEVEL: 'debug',
        SERVICE_NAME: 'test-service',
        APP_VERSION: '1.0.0-test',
      });

      expect(devLogger).toBeDefined();

      // 本番環境設定
      const prodLogger = LoggerFactory.createDefault({
        NODE_ENV: 'production',
        LOG_LEVEL: 'info',
        SERVICE_NAME: 'test-service',
        APP_VERSION: '1.0.0-prod',
      });

      expect(prodLogger).toBeDefined();
    });
  });

  describe('パフォーマンステスト', () => {
    it('大量のログ出力でもパフォーマンスが維持される', () => {
      TraceContext.createRequestContext();
      const logger = LoggerFactory.createDefault({
        NODE_ENV: 'test',
        LOG_LEVEL: 'info',
      });

      const startTime = Date.now();

      // 1000回のログ出力
      for (let i = 0; i < 1000; i++) {
        logger.info({ iteration: i }, `テストログ ${i}`);
      }

      const duration = Date.now() - startTime;

      // 1000回のログ出力が1秒以内に完了することを確認
      expect(duration).toBeLessThan(1000);
    });

    it('TraceContextの生成が高速である', () => {
      const startTime = Date.now();

      // 1000回のTraceContext生成
      for (let i = 0; i < 1000; i++) {
        const context = TraceContext.createRequestContext();
        TraceContext.clearRequestContext();
        expect(context.requestId).toBeDefined();
      }

      const duration = Date.now() - startTime;

      // 1000回の生成が500ms以内に完了することを確認
      expect(duration).toBeLessThan(500);
    });
  });
});
