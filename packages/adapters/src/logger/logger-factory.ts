/**
 * Logger Factory - 環境に応じて適切なLoggerを生成
 * 要件 7.2: requestId、traceId、service、env、version を必須項目として追加
 */

import { DevLogger } from './dev-logger';
import { WorkersLogger } from './workers-logger';
import { TraceContext } from '../trace-context/trace-context';
import type { Logger, LoggerConfig, LogContext } from './types';

export class LoggerFactory {
  /**
   * 環境に応じてLoggerを作成する
   * @param config Logger設定
   * @returns Logger インスタンス（TraceContext統合済み）
   */
  static create(config: LoggerConfig): Logger {
    let baseLogger: Logger;

    // Workers環境の判定（より厳密に）
    const isWorkersEnv =
      typeof globalThis !== 'undefined' &&
      'caches' in globalThis &&
      typeof process === 'undefined';

    if (isWorkersEnv) {
      baseLogger = new WorkersLogger(config);
    } else {
      // Node.js環境（開発環境・テスト環境）
      baseLogger = new DevLogger(config);
    }

    // TraceContextを統合したLoggerでラップ
    return new TraceContextLogger(baseLogger);
  }

  /**
   * デフォルト設定でLoggerを作成する
   */
  static createDefault(env?: Record<string, unknown>): Logger {
    const nodeEnv =
      (env?.NODE_ENV as string) || process.env.NODE_ENV || 'development';
    const isTest = nodeEnv === 'test' || process.env.VITEST === 'true';

    const config: LoggerConfig = {
      level: (env?.LOG_LEVEL ||
        process.env.LOG_LEVEL ||
        'info') as LoggerConfig['level'],
      service:
        (env?.SERVICE_NAME as string) ||
        process.env.SERVICE_NAME ||
        'template-gamma',
      env: nodeEnv,
      version:
        (env?.APP_VERSION as string) || process.env.APP_VERSION || '0.1.0',
      // テスト環境では pretty を無効にして JSON 出力
      pretty: nodeEnv === 'development' && !isTest,
    };

    return LoggerFactory.create(config);
  }
}

/**
 * TraceContextを自動的に統合するLoggerラッパー
 * 要件 7.2: requestId、traceId を必須項目として自動付与
 */
class TraceContextLogger implements Logger {
  constructor(private baseLogger: Logger) {}

  info(objOrMsg: LogContext | string, msg?: string): void {
    if (typeof objOrMsg === 'string') {
      this.baseLogger.info(this.addTraceContext({}), objOrMsg);
    } else {
      this.baseLogger.info(this.addTraceContext(objOrMsg), msg);
    }
  }

  warn(objOrMsg: LogContext | string, msg?: string): void {
    if (typeof objOrMsg === 'string') {
      this.baseLogger.warn(this.addTraceContext({}), objOrMsg);
    } else {
      this.baseLogger.warn(this.addTraceContext(objOrMsg), msg);
    }
  }

  error(objOrMsg: LogContext | string, msg?: string): void {
    if (typeof objOrMsg === 'string') {
      this.baseLogger.error(this.addTraceContext({}), objOrMsg);
    } else {
      this.baseLogger.error(this.addTraceContext(objOrMsg), msg);
    }
  }

  debug(objOrMsg: LogContext | string, msg?: string): void {
    if (typeof objOrMsg === 'string') {
      this.baseLogger.debug(this.addTraceContext({}), objOrMsg);
    } else {
      this.baseLogger.debug(this.addTraceContext(objOrMsg), msg);
    }
  }

  child(bindings: LogContext): Logger {
    return new TraceContextLogger(
      this.baseLogger.child(this.addTraceContext(bindings))
    );
  }

  private addTraceContext(obj: LogContext): LogContext {
    const traceContext = TraceContext.getLogContext();
    return {
      ...traceContext,
      ...obj,
    };
  }
}
