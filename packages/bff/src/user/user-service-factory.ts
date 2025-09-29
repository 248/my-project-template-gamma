/**
 * ユーザーサービスファクトリー
 * 依存性注入とサービス生成を管理
 */

import type { SupabaseAdapter } from '@template-gamma/adapters/supabase';
import type { Logger } from '@template-gamma/adapters/logger';
import { UserServiceImpl } from './user-service';
import type { UserService } from './types';

export class UserServiceFactory {
  static create(supabaseAdapter: SupabaseAdapter, logger: Logger): UserService {
    return new UserServiceImpl(supabaseAdapter, logger);
  }
}
