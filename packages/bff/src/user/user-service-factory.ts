/**
 * ユーザーサービスファクトリー
 * 依存性注入とサービス生成を管理
 */

import type { SupabaseAdapter } from '@template-gamma/adapters/supabase';
import type { Logger } from '@template-gamma/adapters/logger';
import { UserServiceImpl } from './user-service.js';
import type { UserService } from './types.js';

export class UserServiceFactory {
  static create(supabaseAdapter: SupabaseAdapter, logger: Logger): UserService {
    return new UserServiceImpl(supabaseAdapter, logger);
  }
}
