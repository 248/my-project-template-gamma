/**
 * Logger インターフェース定義
 * 要件 7.1, 7.2: Workers Logs 前提の Pino 要件に従い、構造化ログを出力
 */

export interface LogContext {
  requestId?: string;
  traceId?: string;
  spanId?: string;
  service?: string;
  env?: string;
  version?: string;
  userId?: string;
  [key: string]: unknown;
}

export interface Logger {
  info(obj: LogContext, msg?: string): void;
  info(msg: string): void;
  warn(obj: LogContext, msg?: string): void;
  warn(msg: string): void;
  error(obj: LogContext, msg?: string): void;
  error(msg: string): void;
  debug(obj: LogContext, msg?: string): void;
  debug(msg: string): void;
  child(bindings: LogContext): Logger;
}

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LoggerConfig {
  level: LogLevel;
  service: string;
  env: string;
  version: string;
  pretty?: boolean;
  redactPaths?: string[];
}
