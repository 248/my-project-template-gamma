/**
 * 開発環境用Logger（Node.js + Pino）
 * 要件 7.5: 開発環境でログが出力される時 THEN システムは pretty-print を使用する
 */

import pino from 'pino';
import type { Logger, LogContext, LoggerConfig } from './types.js';

export class DevLogger implements Logger {
  private logger: pino.Logger;
  private config: LoggerConfig;

  constructor(config: LoggerConfig) {
    this.config = config;
    this.logger = pino({
      level: config.level,
      transport: config.pretty ? { target: 'pino-pretty' } : undefined,
      base: {
        service: config.service,
        env: config.env,
        version: config.version,
      },
      redact: {
        paths: config.redactPaths || [
          'req.headers.authorization',
          'req.headers.cookie',
          'password',
          'token',
          'accessToken',
          'refreshToken',
          'apiKey',
        ],
        censor: '[REDACTED]',
      },
      timestamp: pino.stdTimeFunctions.isoTime,
    });
  }

  info(objOrMsg: LogContext | string, msg?: string): void {
    if (typeof objOrMsg === 'string') {
      this.logger.info(objOrMsg);
    } else {
      this.logger.info(this.addTimestamp(objOrMsg), msg);
    }
  }

  warn(objOrMsg: LogContext | string, msg?: string): void {
    if (typeof objOrMsg === 'string') {
      this.logger.warn(objOrMsg);
    } else {
      this.logger.warn(this.addTimestamp(objOrMsg), msg);
    }
  }

  error(objOrMsg: LogContext | string, msg?: string): void {
    if (typeof objOrMsg === 'string') {
      this.logger.error(objOrMsg);
    } else {
      this.logger.error(this.addTimestamp(objOrMsg), msg);
    }
  }

  debug(objOrMsg: LogContext | string, msg?: string): void {
    if (typeof objOrMsg === 'string') {
      this.logger.debug(objOrMsg);
    } else {
      this.logger.debug(this.addTimestamp(objOrMsg), msg);
    }
  }

  child(bindings: LogContext): Logger {
    const childLogger = this.logger.child(bindings);
    return new DevLoggerChild(childLogger, this.config);
  }

  private addTimestamp(obj: LogContext): LogContext {
    return {
      ...obj,
      timestamp: new Date().toISOString(),
    };
  }
}

class DevLoggerChild implements Logger {
  constructor(
    private logger: pino.Logger,
    private config: LoggerConfig
  ) {}

  info(objOrMsg: LogContext | string, msg?: string): void {
    if (typeof objOrMsg === 'string') {
      this.logger.info(objOrMsg);
    } else {
      this.logger.info(this.addTimestamp(objOrMsg), msg);
    }
  }

  warn(objOrMsg: LogContext | string, msg?: string): void {
    if (typeof objOrMsg === 'string') {
      this.logger.warn(objOrMsg);
    } else {
      this.logger.warn(this.addTimestamp(objOrMsg), msg);
    }
  }

  error(objOrMsg: LogContext | string, msg?: string): void {
    if (typeof objOrMsg === 'string') {
      this.logger.error(objOrMsg);
    } else {
      this.logger.error(this.addTimestamp(objOrMsg), msg);
    }
  }

  debug(objOrMsg: LogContext | string, msg?: string): void {
    if (typeof objOrMsg === 'string') {
      this.logger.debug(objOrMsg);
    } else {
      this.logger.debug(this.addTimestamp(objOrMsg), msg);
    }
  }

  child(bindings: LogContext): Logger {
    return new DevLoggerChild(this.logger.child(bindings), this.config);
  }

  private addTimestamp(obj: LogContext): LogContext {
    return {
      ...obj,
      timestamp: new Date().toISOString(),
    };
  }
}
