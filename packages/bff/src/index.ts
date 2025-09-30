/**
 * BFF層のメインエクスポート
 * Core層とAdapters層を組み合わせたビジネスファサード層
 */

// エラーハンドリング
export {
  ApiErrorHandler,
  BffError,
  ValidationError as BffValidationError,
  AuthError,
  AuthorizationError,
  NotFoundError,
  createErrorResponse,
  createValidationErrorResponse,
  createAuthErrorResponse,
  createForbiddenErrorResponse,
  createNotFoundErrorResponse,
} from './error-handler';

// エラーコード（contracts から再エクスポート）
export { ERROR_CODES } from '@template-gamma/contracts/error-codes';
export type {
  ErrorCode,
  ApiError,
} from '@template-gamma/contracts/error-codes';

// バリデーションエラーハンドリング
export {
  ValidationError,
  ValidationErrorHandler,
  ValidationErrorHandlerFactory,
  defaultValidationHandler,
} from './validation/validation-error-handler';

// エラーミドルウェア
export {
  ErrorMiddleware,
  defaultErrorMiddleware,
  withErrorHandling,
  withAuthAndErrorHandling,
  withCorsAndErrorHandling,
  withRateLimitAndErrorHandling,
  composeMiddleware,
} from './middleware/error-middleware';

export type {
  ApiHandler,
  ErrorMiddlewareOptions,
} from './middleware/error-middleware';

export type { ValidationErrorDetail } from './validation/validation-error-handler';

// ヘルスチェックサービス
export { HealthServiceImpl, HealthServiceFactory } from './health/index';
export type { HealthService, SystemMetadata } from './health/index';

// 認証サービス
export { AuthServiceImpl, AuthServiceFactory } from './auth/index';
export type {
  AuthService,
  LoginResult,
  CallbackResult,
  SessionInfo,
} from './auth/index';

// 画像管理サービス
export { ImageServiceImpl, ImageServiceFactory } from './images/index';
export type {
  ImageService,
  ImageList,
  UploadResult,
  ImageFile,
  Pagination,
} from './images/index';

// ユーザー管理サービス
export { UserServiceImpl, UserServiceFactory } from './user/index';
export type {
  UserService,
  UserStats,
  CreateUserRequest,
  UpdateLastLoginRequest,
  GetUserStatsRequest,
} from './user/index';

// サービスファクトリー（Route Handler用）
export { ServiceFactory } from './service-factory';
export type { Services, ServiceDependencies } from './service-factory';
