/**
 * BFF層のエラーハンドリング
 * 要件 5.5: API エラーが発生した時 THEN システムはコード + メッセージ形式で返却する
 */

import {
  ApiError,
  ErrorCode,
  ERROR_CODES,
  createApiError,
  getStatusFromErrorCode,
} from '@template-gamma/contracts/error-codes';
import { Logger } from '@template-gamma/adapters';

/**
 * カスタムエラークラス
 */
export class BffError extends Error {
  constructor(
    public readonly code: ErrorCode,
    message?: string,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'BffError';
  }
}

/**
 * バリデーションエラークラス
 */
export class ValidationError extends BffError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(ERROR_CODES.VALIDATION_ERROR, message, details);
    this.name = 'ValidationError';
  }
}

/**
 * 認証エラークラス
 */
export class AuthError extends BffError {
  constructor(code: ErrorCode = ERROR_CODES.AUTH_REQUIRED, message?: string) {
    super(code, message);
    this.name = 'AuthError';
  }
}

/**
 * 認可エラークラス
 */
export class AuthorizationError extends BffError {
  constructor(message?: string) {
    super(ERROR_CODES.FORBIDDEN, message);
    this.name = 'AuthorizationError';
  }
}

/**
 * リソース未発見エラークラス
 */
export class NotFoundError extends BffError {
  constructor(resource: string, id?: string) {
    const message = id
      ? `${resource} with id '${id}' not found`
      : `${resource} not found`;
    super(ERROR_CODES.RESOURCE_NOT_FOUND, message);
    this.name = 'NotFoundError';
  }
}

/**
 * APIエラーハンドラー
 */
export class ApiErrorHandler {
  constructor(private logger: Logger) {}

  /**
   * エラーをAPIレスポンスに変換する（静的メソッド版）
   * @param error エラーオブジェクト
   * @returns Response オブジェクト
   */
  static handle(error: unknown): Response {
    let apiError: ApiError;
    let status: number;

    if (error instanceof BffError) {
      apiError = createApiError(error.code, error.message, error.details);
      status = getStatusFromErrorCode(error.code);
    } else if (error instanceof Error) {
      // 予期しないエラー
      console.error('Unhandled error in BFF layer:', error);
      apiError = createApiError(ERROR_CODES.INTERNAL_ERROR);
      status = 500;
    } else {
      // 不明なエラー
      console.error('Unknown error in BFF layer:', error);
      apiError = createApiError(ERROR_CODES.INTERNAL_ERROR);
      status = 500;
    }

    return Response.json(apiError, { status });
  }

  /**
   * エラーをAPIレスポンスに変換する（インスタンスメソッド版）
   * @param error エラーオブジェクト
   * @returns Response オブジェクト
   */
  handle(error: unknown): Response {
    let apiError: ApiError;
    let status: number;

    if (error instanceof BffError) {
      apiError = createApiError(error.code, error.message, error.details);
      status = getStatusFromErrorCode(error.code);
    } else if (error instanceof Error) {
      // 予期しないエラー
      this.logger.error({ err: error }, 'Unhandled error in BFF layer');
      apiError = createApiError(ERROR_CODES.INTERNAL_ERROR);
      status = 500;
    } else {
      // 不明なエラー
      this.logger.error({ error }, 'Unknown error in BFF layer');
      apiError = createApiError(ERROR_CODES.INTERNAL_ERROR);
      status = 500;
    }

    return Response.json(apiError, { status });
  }

  /**
   * エラーをログに記録する
   * @param error エラーオブジェクト
   * @param context 追加のコンテキスト情報
   */
  logError(error: unknown, context?: Record<string, unknown>): void {
    if (error instanceof BffError) {
      // BFFエラーは警告レベル（予期されたエラー）
      this.logger.warn(
        {
          code: error.code,
          message: error.message,
          details: error.details,
          ...context,
        },
        'BFF error occurred'
      );
    } else {
      // その他のエラーはエラーレベル（予期しないエラー）
      this.logger.error(
        {
          err: error,
          ...context,
        },
        'Unexpected error in BFF layer'
      );
    }
  }
}

/**
 * エラーハンドリングのヘルパー関数
 */
export function createErrorResponse(
  code: ErrorCode,
  message?: string,
  details?: Record<string, unknown>
): Response {
  const apiError = createApiError(code, message, details);
  const status = getStatusFromErrorCode(code);
  return Response.json(apiError, { status });
}

/**
 * バリデーションエラーレスポンスを作成する
 * @param errors バリデーションエラーの配列
 * @returns Response オブジェクト
 */
export function createValidationErrorResponse(
  errors: Array<{ field: string; message: string }>
): Response {
  return createErrorResponse(
    ERROR_CODES.VALIDATION_ERROR,
    'Validation failed',
    {
      errors,
    }
  );
}

/**
 * 認証エラーレスポンスを作成する
 * @param message カスタムメッセージ
 * @returns Response オブジェクト
 */
export function createAuthErrorResponse(message?: string): Response {
  return createErrorResponse(ERROR_CODES.AUTH_REQUIRED, message);
}

/**
 * 認可エラーレスポンスを作成する
 * @param message カスタムメッセージ
 * @returns Response オブジェクト
 */
export function createForbiddenErrorResponse(message?: string): Response {
  return createErrorResponse(ERROR_CODES.FORBIDDEN, message);
}

/**
 * 未発見エラーレスポンスを作成する
 * @param resource リソース名
 * @param id リソースID
 * @returns Response オブジェクト
 */
export function createNotFoundErrorResponse(
  resource: string,
  id?: string
): Response {
  const message = id
    ? `${resource} with id '${id}' not found`
    : `${resource} not found`;
  return createErrorResponse(ERROR_CODES.RESOURCE_NOT_FOUND, message);
}
