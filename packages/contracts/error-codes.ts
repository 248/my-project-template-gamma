/**
 * アプリケーション全体で使用するエラーコード定義
 * OpenAPI仕様書のErrorResponseと連携
 */

export const ERROR_CODES = {
  // 認証関連
  AUTH_REQUIRED: 'AUTH_REQUIRED',
  AUTH_INVALID_TOKEN: 'AUTH_INVALID_TOKEN',
  AUTH_EXPIRED: 'AUTH_EXPIRED',
  AUTH_CALLBACK_FAILED: 'AUTH_CALLBACK_FAILED',

  // 認可関連
  FORBIDDEN: 'FORBIDDEN',
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
  RESOURCE_NOT_OWNED: 'RESOURCE_NOT_OWNED',

  // バリデーション関連
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',
  UNSUPPORTED_FILE_TYPE: 'UNSUPPORTED_FILE_TYPE',
  INVALID_FILE_FORMAT: 'INVALID_FILE_FORMAT',
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',

  // 画像関連
  IMAGE_UPLOAD_FAILED: 'IMAGE_UPLOAD_FAILED',
  IMAGE_PROCESSING_FAILED: 'IMAGE_PROCESSING_FAILED',
  IMAGE_NOT_FOUND: 'IMAGE_NOT_FOUND',
  IMAGE_DELETE_FAILED: 'IMAGE_DELETE_FAILED',

  // システム関連
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  DATABASE_ERROR: 'DATABASE_ERROR',
  STORAGE_ERROR: 'STORAGE_ERROR',

  // ヘルスチェック関連
  HEALTH_CHECK_FAILED: 'HEALTH_CHECK_FAILED',
  DEPENDENCY_UNAVAILABLE: 'DEPENDENCY_UNAVAILABLE',
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

/**
 * APIエラーレスポンスの型定義
 * OpenAPI仕様書のErrorResponseスキーマと対応
 */
export interface ApiError {
  code: ErrorCode;
  message: string;
  details?: Record<string, unknown>;
}

/**
 * エラーコードに対応するHTTPステータスコードのマッピング
 */
export const ERROR_STATUS_MAP: Record<ErrorCode, number> = {
  // 400 Bad Request
  [ERROR_CODES.FILE_TOO_LARGE]: 400,
  [ERROR_CODES.UNSUPPORTED_FILE_TYPE]: 400,
  [ERROR_CODES.INVALID_FILE_FORMAT]: 400,
  [ERROR_CODES.MISSING_REQUIRED_FIELD]: 400,

  // 401 Unauthorized
  [ERROR_CODES.AUTH_REQUIRED]: 401,
  [ERROR_CODES.AUTH_INVALID_TOKEN]: 401,
  [ERROR_CODES.AUTH_EXPIRED]: 401,
  [ERROR_CODES.AUTH_CALLBACK_FAILED]: 401,

  // 403 Forbidden
  [ERROR_CODES.FORBIDDEN]: 403,
  [ERROR_CODES.RESOURCE_NOT_OWNED]: 403,

  // 404 Not Found
  [ERROR_CODES.RESOURCE_NOT_FOUND]: 404,
  [ERROR_CODES.IMAGE_NOT_FOUND]: 404,

  // 422 Unprocessable Entity
  [ERROR_CODES.VALIDATION_ERROR]: 422,
  [ERROR_CODES.IMAGE_UPLOAD_FAILED]: 422,
  [ERROR_CODES.IMAGE_PROCESSING_FAILED]: 422,
  [ERROR_CODES.IMAGE_DELETE_FAILED]: 422,

  // 429 Too Many Requests
  [ERROR_CODES.RATE_LIMIT_EXCEEDED]: 429,

  // 500 Internal Server Error
  [ERROR_CODES.INTERNAL_ERROR]: 500,
  [ERROR_CODES.DATABASE_ERROR]: 500,
  [ERROR_CODES.STORAGE_ERROR]: 500,
  [ERROR_CODES.HEALTH_CHECK_FAILED]: 500,

  // 503 Service Unavailable
  [ERROR_CODES.SERVICE_UNAVAILABLE]: 503,
  [ERROR_CODES.DEPENDENCY_UNAVAILABLE]: 503,
};

/**
 * エラーコードに対応するデフォルトメッセージ
 */
export const ERROR_MESSAGES: Record<ErrorCode, string> = {
  // 認証関連
  [ERROR_CODES.AUTH_REQUIRED]: '認証が必要です',
  [ERROR_CODES.AUTH_INVALID_TOKEN]: '無効な認証トークンです',
  [ERROR_CODES.AUTH_EXPIRED]: '認証トークンが期限切れです',
  [ERROR_CODES.AUTH_CALLBACK_FAILED]: '認証コールバックに失敗しました',

  // 認可関連
  [ERROR_CODES.FORBIDDEN]: 'アクセスが拒否されました',
  [ERROR_CODES.RESOURCE_NOT_FOUND]: 'リソースが見つかりません',
  [ERROR_CODES.RESOURCE_NOT_OWNED]: 'リソースへのアクセス権限がありません',

  // バリデーション関連
  [ERROR_CODES.VALIDATION_ERROR]: '入力値が無効です',
  [ERROR_CODES.FILE_TOO_LARGE]: 'ファイルサイズが大きすぎます',
  [ERROR_CODES.UNSUPPORTED_FILE_TYPE]: 'サポートされていないファイル形式です',
  [ERROR_CODES.INVALID_FILE_FORMAT]: 'ファイル形式が無効です',
  [ERROR_CODES.MISSING_REQUIRED_FIELD]: '必須フィールドが不足しています',

  // 画像関連
  [ERROR_CODES.IMAGE_UPLOAD_FAILED]: '画像のアップロードに失敗しました',
  [ERROR_CODES.IMAGE_PROCESSING_FAILED]: '画像の処理に失敗しました',
  [ERROR_CODES.IMAGE_NOT_FOUND]: '画像が見つかりません',
  [ERROR_CODES.IMAGE_DELETE_FAILED]: '画像の削除に失敗しました',

  // システム関連
  [ERROR_CODES.INTERNAL_ERROR]: '内部サーバーエラーが発生しました',
  [ERROR_CODES.SERVICE_UNAVAILABLE]: 'サービスが利用できません',
  [ERROR_CODES.RATE_LIMIT_EXCEEDED]: 'リクエスト制限に達しました',
  [ERROR_CODES.DATABASE_ERROR]: 'データベースエラーが発生しました',
  [ERROR_CODES.STORAGE_ERROR]: 'ストレージエラーが発生しました',

  // ヘルスチェック関連
  [ERROR_CODES.HEALTH_CHECK_FAILED]: 'ヘルスチェックに失敗しました',
  [ERROR_CODES.DEPENDENCY_UNAVAILABLE]: '依存サービスが利用できません',
};

/**
 * エラーレスポンスを作成するヘルパー関数
 */
export function createApiError(
  code: ErrorCode,
  message?: string,
  details?: Record<string, unknown>
): ApiError {
  return {
    code,
    message: message || ERROR_MESSAGES[code],
    details,
  };
}

/**
 * エラーコードからHTTPステータスコードを取得するヘルパー関数
 */
export function getStatusFromErrorCode(code: ErrorCode): number {
  return ERROR_STATUS_MAP[code] || 500;
}
