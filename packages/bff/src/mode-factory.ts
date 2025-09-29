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

// Monolith mode implementations
import { HealthServiceImpl } from './health/health-service.js';
import { AuthServiceImpl } from './auth/auth-service.js';
import { ImageServiceImpl } from './images/image-service.js';
import { UserServiceImpl } from './user/user-service.js';

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
 */
export class MonolithServiceFactory implements ServiceFactory {
  createHealthService(): HealthService {
    return new HealthServiceImpl();
  }

  createAuthService(): AuthService {
    return new AuthServiceImpl();
  }

  createImageService(): ImageService {
    return new ImageServiceImpl();
  }

  createUserService(): UserService {
    return new UserServiceImpl();
  }
}

/**
 * Service モード用のサービスファクトリー（将来実装）
 */
export class ServiceModeFactory implements ServiceFactory {
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
export function createServiceFactory(): ServiceFactory {
  const mode = getBackendMode();

  switch (mode) {
    case BACKEND_MODES.MONOLITH:
      return new MonolithServiceFactory();
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
