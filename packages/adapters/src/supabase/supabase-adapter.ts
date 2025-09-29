/**
 * 実際のSupabase接続を行うAdapter
 * 要件 6.1: Supabase Auth Cookie を利用
 * 要件 10.1-10.4: ユーザー情報の永続化
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { User } from '@template-gamma/core/user';
import type { SupabaseAdapter, SupabaseConfig, DatabaseUser } from './types';

export class SupabaseAdapterImpl implements SupabaseAdapter {
  private client: SupabaseClient;
  private serviceClient?: SupabaseClient;

  constructor(config: SupabaseConfig) {
    // 通常のクライアント（anon key）
    this.client = createClient(config.url, config.anonKey);

    // サービスロールクライアント（管理操作用）
    if (config.serviceRoleKey) {
      this.serviceClient = createClient(config.url, config.serviceRoleKey);
    }
  }

  async ping(): Promise<boolean> {
    try {
      // 軽量なヘルスチェッククエリ
      const { error } = await this.client
        .from('app_users')
        .select('id')
        .limit(1);

      return !error;
    } catch {
      return false;
    }
  }

  async createUser(user: Omit<User, 'createdAt' | 'updatedAt'>): Promise<User> {
    const { data, error } = await this.client
      .from('app_users')
      .insert({
        id: user.id,
        last_login_at: user.lastLoginAt.toISOString(),
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create user: ${error.message}`);
    }

    return this.mapDatabaseUserToUser(data);
  }

  async getUserById(id: string): Promise<User | null> {
    const { data, error } = await this.client
      .from('app_users')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // レコードが見つからない場合
        return null;
      }
      throw new Error(`Failed to get user: ${error.message}`);
    }

    return this.mapDatabaseUserToUser(data);
  }

  async updateLastLogin(userId: string): Promise<void> {
    const { error } = await this.client
      .from('app_users')
      .update({
        last_login_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (error) {
      throw new Error(`Failed to update last login: ${error.message}`);
    }
  }

  async getUser(
    accessToken: string
  ): Promise<{ id: string; email?: string } | null> {
    try {
      const {
        data: { user },
        error,
      } = await this.client.auth.getUser(accessToken);

      if (error || !user) {
        return null;
      }

      return {
        id: user.id,
        email: user.email,
      };
    } catch {
      return null;
    }
  }

  private mapDatabaseUserToUser(dbUser: DatabaseUser): User {
    return {
      id: dbUser.id,
      createdAt: new Date(dbUser.created_at),
      updatedAt: new Date(dbUser.updated_at),
      lastLoginAt: new Date(dbUser.last_login_at),
    };
  }
}
