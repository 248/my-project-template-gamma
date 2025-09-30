/**
 * モード切替ファクトリー
 * 要件17.1: BACKEND_MODE=monolith|service を CI マトリクスで両方検証する
 */

import {
  getBackendMode,
  isMonolithMode,
  BACKEND_MODES,
} from '@template-gamma/contracts/backend-mode';
import type { HealthService } from './health/index.js';
import type { AuthService } from './auth/index.js';
import type { ImageService } from './images/index.js';
import type { UserService } from './user/index.js';

// 既存のファクトリーパターンを活用
import { HealthServiceFactory } from './health/health-service.js';
import { AuthServiceFactory } from './auth/auth-service.js';
import { ImageServiceFactory } from './images/image-service.js';
import { UserServiceFactory } from './user/user-service-factory.js';

// アダプターファクトリー
import {
  SupabaseFactory,
  StorageFactory,
  LoggerFactory,
} from '@template-gamma/adapters';
import type {
  SupabaseAdapter,
  StorageAdapter,
  Logger,
} from '@template-gamma/adapters';

// Service mode implementations (将来実装)
// import { ExternalHealthService } from './external/health-service.js';
// import { ExternalAuthService } from './external/auth-service.js';
// import { ExternalImageService } from './external/image-service.js';
// import { ExternalUserService } from './external/user-service.js';

export interface ServiceFactory {
  createHealthService(): HealthService;
  createAuthService(): AuthService;
  createImageService(): ImageService;
  createUserService(): UserService;
}

/**
 * Monolith モード用のサービスファクトリー
 * 既存の*ServiceFactory.create()パターンを活用して依存関係を注入
 */
export class MonolithServiceFactory implements ServiceFactory {
  private supabaseAdapter: SupabaseAdapter;
  private storageAdapter: StorageAdapter;
  private logger: Logger;

  constructor(env?: Record<string, unknown>) {
    // 環境変数からアダプターを初期化
    this.supabaseAdapter = SupabaseFactory.create(env);
    this.storageAdapter = StorageFactory.create(env);
    this.logger = LoggerFactory.createDefault(env);
  }

  createHealthService(): HealthService {
    return HealthServiceFactory.create(
      this.supabaseAdapter,
      this.storageAdapter,
      this.logger
    );
  }

  createAuthService(): AuthService {
    return AuthServiceFactory.create(this.supabaseAdapter, this.logger);
  }

  createImageService(): ImageService {
    return ImageServiceFactory.create(
      this.supabaseAdapter,
      this.storageAdapter,
      this.logger
    );
  }

  createUserService(): UserService {
    return UserServiceFactory.create(this.supabaseAdapter, this.logger);
  }
}

/**
 * Service モード用のサービスファクトリー（将来実装）
 */
export class ServiceModeFactory implements ServiceFactory {
  constructor() {
    // 将来: 外部サービス用の設定を初期化
  }

  createHealthService(): HealthService {
    // 将来: 外部サービスへのHTTPクライアント実装
    throw new Error(
      'Service mode not implemented yet. Use BACKEND_MODE=monolith'
    );
  }

  createAuthService(): AuthService {
    throw new Error(
      'Service mode not implemented yet. Use BACKEND_MODE=monolith'
    );
  }

  createImageService(): ImageService {
    throw new Error(
      'Service mode not implemented yet. Use BACKEND_MODE=monolith'
    );
  }

  createUserService(): UserService {
    throw new Error(
      'Service mode not implemented yet. Use BACKEND_MODE=monolith'
    );
  }
}

/**
 * 現在のモードに応じたサービスファクトリーを取得
 */
export function createServiceFactory(
  env?: Record<string, unknown>
): ServiceFactory {
  const mode = getBackendMode();

  switch (mode) {
    case BACKEND_MODES.MONOLITH:
      return new MonolithServiceFactory(env);
    case BACKEND_MODES.SERVICE:
      return new ServiceModeFactory();
    default:
      throw new Error(`Unknown backend mode: ${mode}`);
  }
}

/**
 * モード情報を取得
 */
export function getModeInfo() {
  const mode = getBackendMode();
  return {
    mode,
    isMonolith: isMonolithMode(),
    description:
      mode === BACKEND_MODES.MONOLITH
        ? 'Direct BFF layer access to adapters'
        : 'External service communication via HTTP client',
  };
}
