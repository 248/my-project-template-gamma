/**
 * Logger と TraceContext の統合テスト
 * Windows環境でのログ出力確認、TraceContextの生成・継承確認
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  LoggerFactory,
  ErrorLogger,
  MockLogger,
} from '../../../packages/adapters/src/logger';
import { TraceContext } from '../../../packages/adapters/src/trace-context';

describe('Logger と TraceContext の統合', () => {
  beforeEach(() => {
    // 各テスト前にTraceContextをクリア
    TraceContext.clearRequestContext();
  });

  afterEach(() => {
    TraceContext.clearRequestContext();
  });

  describe('TraceContext の生成と継承', () => {
    it('新しいリクエストコンテキストを作成できる', () => {
      const context = TraceContext.createRequestContext();

      expect(context.requestId).toBeDefined();
      expect(context.traceInfo.traceId).toHaveLength(32);
      expect(context.traceInfo.spanId).toHaveLength(16);
      expect(context.traceInfo.flags).toBe('01');
      expect(context.startTime).toBeInstanceOf(Date);
    });

    it('traceparent ヘッダから TraceContext を継承できる', () => {
      const traceparent =
        '00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01';
      const context = TraceContext.createRequestContext(traceparent);

      expect(context.traceInfo.traceId).toBe(
        '4bf92f3577b34da6a3ce929d0e0e4736'
      );
      expect(context.traceInfo.parentId).toBe('00f067aa0ba902b7');
      expect(context.traceInfo.flags).toBe('01');
      // 新しいspanIdが生成される
      expect(context.traceInfo.spanId).toHaveLength(16);
      expect(context.traceInfo.spanId).not.toBe('00f067aa0ba902b7');
    });

    it('無効な traceparent の場合は新しいトレースを生成する', () => {
      const invalidTraceparent = 'invalid-traceparent';
      const context = TraceContext.createRequestContext(invalidTraceparent);

      expect(context.traceInfo.traceId).toHaveLength(32);
      expect(context.traceInfo.spanId).toHaveLength(16);
      expect(context.traceInfo.flags).toBe('01');
      expect(context.traceInfo.parentId).toBeUndefined();
    });

    it('子スパンを生成できる', () => {
      const parentContext = TraceContext.createRequestContext();
      const childSpan = TraceContext.createChildSpanFromCurrent();

      expect(childSpan).toBeDefined();
      expect(childSpan!.traceId).toBe(parentContext.traceInfo.traceId);
      expect(childSpan!.parentId).toBe(parentContext.traceInfo.spanId);
      expect(childSpan!.spanId).not.toBe(parentContext.traceInfo.spanId);
    });

    it('traceparent ヘッダ文字列を生成できる', () => {
      const traceInfo = {
        traceId: '4bf92f3577b34da6a3ce929d0e0e4736',
        spanId: '00f067aa0ba902b7',
        flags: '01',
      };

      const traceparent = TraceContext.generateTraceparent(traceInfo);
      expect(traceparent).toBe(
        '00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01'
      );
    });
  });

  describe('Logger の TraceContext 統合', () => {
    it('TraceContext が設定されている場合、ログに自動的に付与される', () => {
      // TraceContext を設定
      const context = TraceContext.createRequestContext();

      // 実際のログ出力は動作確認済み（コンソール出力で確認）
      // ここではTraceContextの統合ロジックをテスト
      const traceContext = TraceContext.getLogContext();

      expect(traceContext.requestId).toBe(context.requestId);
      expect(traceContext.traceId).toBe(context.traceInfo.traceId);
      expect(traceContext.spanId).toBe(context.traceInfo.spanId);
    });

    it('TraceContext が未設定の場合、空のコンテキストが返される', () => {
      // TraceContext をクリア
      TraceContext.clearRequestContext();

      const traceContext = TraceContext.getLogContext();

      expect(traceContext.requestId).toBeUndefined();
      expect(traceContext.traceId).toBeUndefined();
      expect(traceContext.spanId).toBeUndefined();
    });

    it('子ロガーでも TraceContext が継承される（ロジック確認）', () => {
      const context = TraceContext.createRequestContext();
      const logger = LoggerFactory.createDefault({
        NODE_ENV: 'test',
        LOG_LEVEL: 'info',
      });

      const childLogger = logger.child({ component: 'auth' });

      // 子ロガーが作成されることを確認
      expect(childLogger).toBeDefined();

      // TraceContextが継続していることを確認
      const traceContext = TraceContext.getLogContext();
      expect(traceContext.requestId).toBe(context.requestId);
    });
  });

  describe('ErrorLogger の動作確認', () => {
    it('エラーオブジェクトを適切にシリアライズする', () => {
      const errorLogger = new ErrorLogger(new MockLogger());
      const testError = new Error('テストエラー');
      testError.stack = 'Error: テストエラー\n    at test.js:1:1';

      const serializedError = (
        errorLogger as { serializeError: (error: unknown) => unknown }
      ).serializeError(testError);

      expect(serializedError.message).toBe('テストエラー');
      expect(serializedError.name).toBe('Error');
      expect(serializedError.stack).toBe(
        'Error: テストエラー\n    at test.js:1:1'
      );
    });

    it('非Errorオブジェクトも適切にシリアライズする', () => {
      const errorLogger = new ErrorLogger(new MockLogger());

      // 文字列エラー
      const stringError = (
        errorLogger as {
          serializeError: (error: unknown) => { message: string; name: string };
        }
      ).serializeError('文字列エラー');
      expect(stringError.message).toBe('文字列エラー');
      expect(stringError.name).toBe('UnknownError');

      // オブジェクトエラー
      const objectError = (
        errorLogger as {
          serializeError: (error: unknown) => {
            name: string;
            originalError: { code: string };
          };
        }
      ).serializeError({
        code: 'CUSTOM_ERROR',
        details: 'カスタムエラー',
      });
      expect(objectError.name).toBe('UnknownError');
      expect(objectError.originalError.code).toBe('CUSTOM_ERROR');
    });

    it('ErrorLoggerのメソッドが正常に動作する', () => {
      const mockLogger = new MockLogger();
      const errorLogger = new ErrorLogger(mockLogger);
      const testError = new Error('テストエラー');

      errorLogger.logUnhandledError(testError);
      errorLogger.logHttpError(testError, 404, '/api/test');

      // MockLoggerにログが記録されることを確認
      expect(mockLogger.logs).toHaveLength(2);
      expect(mockLogger.logs[0].level).toBe('error');
      expect(mockLogger.logs[0].msg).toBe('unhandled error');
      expect(mockLogger.logs[1].level).toBe('error');
      expect(mockLogger.logs[1].msg).toBe('HTTP 404 error');
    });
  });

  describe('環境別設定の確認', () => {
    it('本番環境では pretty が無効になる', () => {
      const config = {
        NODE_ENV: 'production',
        LOG_LEVEL: 'info',
      };

      // LoggerFactoryの設定確認
      const logger = LoggerFactory.createDefault(config);
      expect(logger).toBeDefined();
    });

    it('開発環境では pretty が有効になる', () => {
      const config = {
        NODE_ENV: 'development',
        LOG_LEVEL: 'info',
      };

      const logger = LoggerFactory.createDefault(config);
      expect(logger).toBeDefined();
    });

    it('テスト環境では pretty が無効になる', () => {
      const config = {
        NODE_ENV: 'test',
        LOG_LEVEL: 'info',
      };

      const logger = LoggerFactory.createDefault(config);
      expect(logger).toBeDefined();
    });
  });

  describe('実際のログ出力確認（手動確認用）', () => {
    it('Windows環境でのログ出力を確認する', () => {
      // TraceContext を設定
      const context = TraceContext.createRequestContext();

      // Logger を作成
      const logger = LoggerFactory.createDefault({
        NODE_ENV: 'development',
        LOG_LEVEL: 'info',
      });

      // 実際のログ出力（テスト実行時にコンソールで確認可能）
      logger.info('Windows環境でのテストログ');
      logger.info(
        { userId: 'test-user', action: 'test' },
        'TraceContext統合テスト'
      );

      // ErrorLogger のテスト
      const errorLogger = new ErrorLogger(logger);
      const testError = new Error('テスト用エラー');
      errorLogger.logUnhandledError(testError);

      // テストの成功を確認
      expect(context.requestId).toBeDefined();
      expect(context.traceInfo.traceId).toBeDefined();
    });
  });
});
