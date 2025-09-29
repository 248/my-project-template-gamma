/**
 * テスト用モックLogger
 * Windows環境でのテスト実行用
 */

import type { Logger, LogContext } from './types.js';

export class MockLogger implements Logger {
  public logs: Array<{
    level: string;
    obj?: LogContext;
    msg?: string;
    timestamp: Date;
  }> = [];

  info(objOrMsg: LogContext | string, msg?: string): void {
    if (typeof objOrMsg === 'string') {
      this.logs.push({
        level: 'info',
        msg: objOrMsg,
        timestamp: new Date(),
      });
    } else {
      this.logs.push({
        level: 'info',
        obj: objOrMsg,
        msg,
        timestamp: new Date(),
      });
    }
  }

  warn(objOrMsg: LogContext | string, msg?: string): void {
    if (typeof objOrMsg === 'string') {
      this.logs.push({
        level: 'warn',
        msg: objOrMsg,
        timestamp: new Date(),
      });
    } else {
      this.logs.push({
        level: 'warn',
        obj: objOrMsg,
        msg,
        timestamp: new Date(),
      });
    }
  }

  error(objOrMsg: LogContext | string, msg?: string): void {
    if (typeof objOrMsg === 'string') {
      this.logs.push({
        level: 'error',
        msg: objOrMsg,
        timestamp: new Date(),
      });
    } else {
      this.logs.push({
        level: 'error',
        obj: objOrMsg,
        msg,
        timestamp: new Date(),
      });
    }
  }

  debug(objOrMsg: LogContext | string, msg?: string): void {
    if (typeof objOrMsg === 'string') {
      this.logs.push({
        level: 'debug',
        msg: objOrMsg,
        timestamp: new Date(),
      });
    } else {
      this.logs.push({
        level: 'debug',
        obj: objOrMsg,
        msg,
        timestamp: new Date(),
      });
    }
  }

  child(bindings: LogContext): Logger {
    const childLogger = new MockLogger();
    // 親のログを継承し、bindingsを適用
    childLogger.logs = [...this.logs];

    // bindingsをchildLoggerに適用（将来の拡張用）
    Object.keys(bindings).forEach(() => {
      // 現在はbindingsを単純に認識するだけ
      // 将来的にはログにbindingsを含める実装を追加予定
    });

    return childLogger;
  }

  // テスト用のヘルパーメソッド
  clear(): void {
    this.logs = [];
  }

  getLogsByLevel(level: string): Array<{
    level: string;
    obj?: LogContext;
    msg?: string;
    timestamp: Date;
  }> {
    return this.logs.filter((log) => log.level === level);
  }

  getLastLog():
    | {
        level: string;
        obj?: LogContext;
        msg?: string;
        timestamp: Date;
      }
    | undefined {
    return this.logs[this.logs.length - 1];
  }

  hasLogWithMessage(message: string): boolean {
    return this.logs.some((log) => log.msg?.includes(message));
  }

  hasLogWithObject(key: string, value: unknown): boolean {
    return this.logs.some((log) => log.obj && log.obj[key] === value);
  }
}
