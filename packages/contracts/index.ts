/**
 * Contracts パッケージのメインエクスポート
 * アプリケーション全体で共有される契約定義
 */

// エラーコード定義
export {
  ERROR_CODES,
  ERROR_STATUS_MAP,
  ERROR_MESSAGES,
  createApiError,
  getStatusFromErrorCode,
} from './error-codes';

export type { ErrorCode, ApiError } from './error-codes';

// バリデーションスキーマ
export {
  CommonSchemas,
  ImageSchemas,
  UserSchemas,
  HealthSchemas,
  ErrorSchemas,
  EnvSchemas,
  formatZodError,
  validateWithZod,
  ValidationHelper,
} from './validation-schemas';
