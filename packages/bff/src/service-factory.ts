/**
 * BFFサービスファクトリー
 * 全てのサービスの依存性注入を一元管理
 * Route Handlerからの直接的なアダプター生成を防ぐ
 */

import {
  createSupabaseAdapter,
  createStorageAdapter,
  createLogger,
  type SupabaseAdapter,
  type StorageAdapter,
  type Logger,
} from '@template-gamma/adapters';

import { HealthServiceFactory, type HealthService } from './health';
import { AuthServiceFactory, type AuthService } from './auth';
import { ImageServiceFactory, type ImageService } from './images';
import { UserServiceFactory, type UserService } from './user';

export interface ServiceDependencies {
  supabaseAdapter: SupabaseAdapter;
  storageAdapter: StorageAdapter;
  logger: Logger;
}

export interface Services {
  health: HealthService;
  auth: AuthService;
  image: ImageService;
  user: UserService;
}

export class ServiceFactory {
  private static createDependencies(): ServiceDependencies {
    const logger = createLogger();
    const supabaseAdapter = createSupabaseAdapter();
    const storageAdapter = createStorageAdapter({
      type: 'mock', // Windows環境ではモック版を使用
    });

    return {
      supabaseAdapter,
      storageAdapter,
      logger,
    };
  }

  static createServices(): Services {
    const deps = this.createDependencies();

    return {
      health: HealthServiceFactory.create(
        deps.supabaseAdapter,
        deps.storageAdapter,
        deps.logger
      ),
      auth: AuthServiceFactory.create(deps.supabaseAdapter, deps.logger),
      image: ImageServiceFactory.create(
        deps.supabaseAdapter,
        deps.storageAdapter,
        deps.logger
      ),
      user: UserServiceFactory.create(deps.supabaseAdapter, deps.logger),
    };
  }

  static createUserService(): UserService {
    const deps = this.createDependencies();
    return UserServiceFactory.create(deps.supabaseAdapter, deps.logger);
  }

  static createImageService(): ImageService {
    const deps = this.createDependencies();
    return ImageServiceFactory.create(
      deps.supabaseAdapter,
      deps.storageAdapter,
      deps.logger
    );
  }

  static createHealthService(): HealthService {
    const deps = this.createDependencies();
    return HealthServiceFactory.create(
      deps.supabaseAdapter,
      deps.storageAdapter,
      deps.logger
    );
  }

  static createAuthService(): AuthService {
    const deps = this.createDependencies();
    return AuthServiceFactory.create(deps.supabaseAdapter, deps.logger);
  }
}
