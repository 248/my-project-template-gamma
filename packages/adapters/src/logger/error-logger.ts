/**
 * エラーログ専用のヘルパー
 * 要件 7.4: logger.error({ err }, 'unhandled error') 形式で stack を構造化する
 */

import type { Logger, LogContext } from './types';

export interface SerializedError {
  name: string;
  message: string;
  stack?: string;
  cause?: unknown;
  [key: string]: unknown;
}

export class ErrorLogger {
  constructor(private logger: Logger) {}

  /**
   * エラーオブジェクトを構造化してログ出力
   * @param error エラーオブジェクト
   * @param message ログメッセージ
   * @param context 追加のコンテキスト
   */
  logError(
    error: Error | unknown,
    message: string,
    context: LogContext = {}
  ): void {
    const errorContext: LogContext = {
      ...context,
      err: this.serializeError(error),
    };

    this.logger.error(errorContext, message);
  }

  /**
   * 未処理エラーをログ出力（要件7.4の形式）
   * @param error エラーオブジェクト
   * @param context 追加のコンテキスト
   */
  logUnhandledError(error: Error | unknown, context: LogContext = {}): void {
    this.logError(error, 'unhandled error', context);
  }

  /**
   * HTTPエラーをログ出力
   * @param error エラーオブジェクト
   * @param statusCode HTTPステータスコード
   * @param path リクエストパス
   * @param context 追加のコンテキスト
   */
  logHttpError(
    error: Error | unknown,
    statusCode: number,
    path: string,
    context: LogContext = {}
  ): void {
    this.logError(error, `HTTP ${statusCode} error`, {
      ...context,
      statusCode,
      path,
    });
  }

  /**
   * エラーオブジェクトを安全にシリアライズ
   * @param error エラーオブジェクト
   * @returns シリアライズされたエラー
   */
  private serializeError(error: unknown): SerializedError {
    if (error instanceof Error) {
      return {
        name: error.name,
        message: error.message,
        stack: error.stack,
        cause: error.cause,
        // Error オブジェクトの追加プロパティも含める
        ...Object.getOwnPropertyNames(error).reduce(
          (acc, key) => {
            if (!['name', 'message', 'stack', 'cause'].includes(key)) {
              acc[key] = (error as Record<string, unknown>)[key];
            }
            return acc;
          },
          {} as Record<string, unknown>
        ),
      };
    }

    // Error オブジェクトでない場合
    if (typeof error === 'object' && error !== null) {
      return {
        name: 'UnknownError',
        message: String(error),
        originalError: error,
      };
    }

    return {
      name: 'UnknownError',
      message: String(error),
    };
  }

  /**
   * 子ロガーを作成
   * @param bindings バインディング
   * @returns 新しいErrorLoggerインスタンス
   */
  child(bindings: LogContext): ErrorLogger {
    return new ErrorLogger(this.logger.child(bindings));
  }
}
