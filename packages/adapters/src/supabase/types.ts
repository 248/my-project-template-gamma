/**
 * Supabase Adapter 型定義
 * 要件 6.1: セッションが管理される時 THEN システムは Supabase Auth Cookie を利用する
 */

import type { User } from '@template-gamma/core/user';

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  serviceRoleKey?: string;
}

export interface SupabaseAdapter {
  // ヘルスチェック
  ping(): Promise<boolean>;

  // ユーザー管理
  createUser(user: Omit<User, 'createdAt' | 'updatedAt'>): Promise<User>;
  getUserById(id: string): Promise<User | null>;
  updateLastLogin(userId: string): Promise<void>;

  // 認証関連
  getUser(accessToken: string): Promise<{ id: string; email?: string } | null>;
}

export interface DatabaseUser {
  id: string;
  created_at: string;
  updated_at: string;
  last_login_at: string;
}
