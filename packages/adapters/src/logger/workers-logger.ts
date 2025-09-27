/**
 * Cloudflare Workers環境用Logger
 * 要件 7.2, 7.6: JSON 単行で出力し、本番/CI 環境でログが出力される時 THEN システムは JSONL 出力を使用する
 */

import type { Logger, LogContext, LoggerConfig } from './types.js';

export class WorkersLogger implements Logger {
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
    return new WorkersLoggerChild(this.config, {
      ...this.baseContext,
      ...bindings,
    });
  }

  private log(
    level: string,
    objOrMsg: LogContext | string,
    msg?: string
  ): void {
    const logEntry = this.createLogEntry(level, objOrMsg, msg);
    const jsonLog = JSON.stringify(this.redactSensitiveData(logEntry));

    // Workers環境では console.log/error が Workers Logs に送信される
    if (level === 'error') {
      console.error(jsonLog);
    } else {
      console.log(jsonLog);
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

    // 簡単なredaction実装（ネストしたオブジェクトは考慮しない）
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

    return redacted;
  }
}

class WorkersLoggerChild implements Logger {
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
    return new WorkersLoggerChild(this.config, {
      ...this.bindings,
      ...bindings,
    });
  }

  private log(
    level: string,
    objOrMsg: LogContext | string,
    msg?: string
  ): void {
    const logEntry = this.createLogEntry(level, objOrMsg, msg);
    const jsonLog = JSON.stringify(this.redactSensitiveData(logEntry));

    if (level === 'error') {
      console.error(jsonLog);
    } else {
      console.log(jsonLog);
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

    return redacted;
  }
}
