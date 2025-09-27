/**
 * BFF層のメインエクスポート
 * Core層とAdapters層を組み合わせたビジネスファサード層
 */

// エラーハンドリング
export {
  ApiErrorHandler,
  BffError,
  ValidationError,
  AuthError,
  AuthorizationError,
  NotFoundError,
  createErrorResponse,
  createValidationErrorResponse,
  createAuthErrorResponse,
  createForbiddenErrorResponse,
  createNotFoundErrorResponse,
} from './error-handler.js';

// ヘルスチェックサービス
export { HealthServiceImpl, HealthServiceFactory } from './health/index.js';
export type { HealthService, SystemMetadata } from './health/index.js';

// 認証サービス
export { AuthServiceImpl, AuthServiceFactory } from './auth/index.js';
export type {
  AuthService,
  LoginResult,
  CallbackResult,
  SessionInfo,
} from './auth/index.js';

// 画像管理サービス
export { ImageServiceImpl, ImageServiceFactory } from './images/index.js';
export type {
  ImageService,
  ImageList,
  UploadResult,
  ImageFile,
  Pagination,
} from './images/index.js';
