/**
 * クライアントサイド用Logger
 * 要件 7.1, 7.2: 構造化ログ、TraceContext統合
 */

import type { Logger, LogContext, LoggerConfig } from './types';

export class ClientLogger implements Logger {
  private config: LoggerConfig;
  private baseContext: LogContext;

  constructor(config: LoggerConfig) {
    this.config = config;
    this.baseContext = {
      service: config.service,
      env: config.env,
      version: config.version,
    };
  }

  info(objOrMsg: LogContext | string, msg?: string): void {
    this.log('info', objOrMsg, msg);
  }

  warn(objOrMsg: LogContext | string, msg?: string): void {
    this.log('warn', objOrMsg, msg);
  }

  error(objOrMsg: LogContext | string, msg?: string): void {
    this.log('error', objOrMsg, msg);
  }

  debug(objOrMsg: LogContext | string, msg?: string): void {
    if (this.config.level === 'debug') {
      this.log('debug', objOrMsg, msg);
    }
  }

  child(bindings: LogContext): Logger {
    return new ClientLoggerChild(this.config, {
      ...this.baseContext,
      ...bindings,
    });
  }

  private log(
    level: string,
    objOrMsg: LogContext | string,
    msg?: string
  ): void {
    // 開発環境でのみログを出力
    if (process.env.NODE_ENV === 'development') {
      const logEntry = this.createLogEntry(level, objOrMsg, msg);
      const redactedEntry = this.redactSensitiveData(logEntry);

      // ブラウザのコンソールに出力
      if (level === 'error') {
        console.error(`[${level.toUpperCase()}]`, redactedEntry);
      } else if (level === 'warn') {
        console.warn(`[${level.toUpperCase()}]`, redactedEntry);
      } else if (level === 'debug') {
        console.debug(`[${level.toUpperCase()}]`, redactedEntry);
      } else {
        console.log(`[${level.toUpperCase()}]`, redactedEntry);
      }
    }

    // 本番環境では重要なエラーのみSentryに送信（将来実装）
    if (level === 'error' && process.env.NODE_ENV === 'production') {
      // TODO: Sentry統合時に実装
      // Sentry.captureException(error);
    }
  }

  private createLogEntry(
    level: string,
    objOrMsg: LogContext | string,
    msg?: string
  ): LogContext {
    const timestamp = new Date().toISOString();

    if (typeof objOrMsg === 'string') {
      return {
        ...this.baseContext,
        level,
        msg: objOrMsg,
        timestamp,
        // クライアントサイドではrequestId/traceIdは生成しない
        // （サーバーサイドから受け取る場合のみ使用）
      };
    } else {
      return {
        ...this.baseContext,
        ...objOrMsg,
        level,
        msg: msg || objOrMsg.msg,
        timestamp,
      };
    }
  }

  private redactSensitiveData(obj: LogContext): LogContext {
    const redacted = { ...obj };
    const redactPaths = this.config.redactPaths || [
      'authorization',
      'cookie',
      'password',
      'token',
      'accessToken',
      'refreshToken',
      'apiKey',
    ];

    // 簡単なredaction実装
    for (const path of redactPaths) {
      if (redacted[path]) {
        redacted[path] = '[REDACTED]';
      }
    }

    // エラーオブジェクトの処理
    if (redacted.err && redacted.err instanceof Error) {
      redacted.err = {
        name: redacted.err.name,
        message: redacted.err.message,
        stack: redacted.err.stack,
      };
    }

    // error プロパティの処理も追加
    if (redacted.error && redacted.error instanceof Error) {
      redacted.error = {
        name: redacted.error.name,
        message: redacted.error.message,
        stack: redacted.error.stack,
      };
    }

    return redacted;
  }
}

class ClientLoggerChild implements Logger {
  constructor(
    private config: LoggerConfig,
    private bindings: LogContext
  ) {}

  info(objOrMsg: LogContext | string, msg?: string): void {
    this.log('info', objOrMsg, msg);
  }

  warn(objOrMsg: LogContext | string, msg?: string): void {
    this.log('warn', objOrMsg, msg);
  }

  error(objOrMsg: LogContext | string, msg?: string): void {
    this.log('error', objOrMsg, msg);
  }

  debug(objOrMsg: LogContext | string, msg?: string): void {
    if (this.config.level === 'debug') {
      this.log('debug', objOrMsg, msg);
    }
  }

  child(bindings: LogContext): Logger {
    return new ClientLoggerChild(this.config, {
      ...this.bindings,
      ...bindings,
    });
  }

  private log(
    level: string,
    objOrMsg: LogContext | string,
    msg?: string
  ): void {
    // 開発環境でのみログを出力
    if (process.env.NODE_ENV === 'development') {
      const logEntry = this.createLogEntry(level, objOrMsg, msg);
      const redactedEntry = this.redactSensitiveData(logEntry);

      if (level === 'error') {
        console.error(`[${level.toUpperCase()}]`, redactedEntry);
      } else if (level === 'warn') {
        console.warn(`[${level.toUpperCase()}]`, redactedEntry);
      } else if (level === 'debug') {
        console.debug(`[${level.toUpperCase()}]`, redactedEntry);
      } else {
        console.log(`[${level.toUpperCase()}]`, redactedEntry);
      }
    }
  }

  private createLogEntry(
    level: string,
    objOrMsg: LogContext | string,
    msg?: string
  ): LogContext {
    const timestamp = new Date().toISOString();

    if (typeof objOrMsg === 'string') {
      return {
        ...this.bindings,
        level,
        msg: objOrMsg,
        timestamp,
      };
    } else {
      return {
        ...this.bindings,
        ...objOrMsg,
        level,
        msg: msg || objOrMsg.msg,
        timestamp,
      };
    }
  }

  private redactSensitiveData(obj: LogContext): LogContext {
    const redacted = { ...obj };
    const redactPaths = this.config.redactPaths || [
      'authorization',
      'cookie',
      'password',
      'token',
      'accessToken',
      'refreshToken',
      'apiKey',
    ];

    for (const path of redactPaths) {
      if (redacted[path]) {
        redacted[path] = '[REDACTED]';
      }
    }

    if (redacted.err && redacted.err instanceof Error) {
      redacted.err = {
        name: redacted.err.name,
        message: redacted.err.message,
        stack: redacted.err.stack,
      };
    }

    // error プロパティの処理も追加
    if (redacted.error && redacted.error instanceof Error) {
      redacted.error = {
        name: redacted.error.name,
        message: redacted.error.message,
        stack: redacted.error.stack,
      };
    }

    return redacted;
  }
}
