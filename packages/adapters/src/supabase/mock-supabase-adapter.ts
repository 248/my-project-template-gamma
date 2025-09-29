/**
 * モック版Supabase Adapter（開発・テスト用）
 * Windows環境での動作確認用
 */

import type { User } from '@template-gamma/core/user';
import type { SupabaseAdapter } from './types';

export class MockSupabaseAdapter implements SupabaseAdapter {
  private users = new Map<string, User>();
  private shouldFailPing = false;

  constructor(options?: { shouldFailPing?: boolean }) {
    this.shouldFailPing = options?.shouldFailPing || false;

    // テスト用のダミーユーザーを追加
    const testUser: User = {
      id: 'test-user-id',
      createdAt: new Date('2024-01-01T00:00:00Z'),
      updatedAt: new Date('2024-01-01T00:00:00Z'),
      lastLoginAt: new Date('2024-01-01T00:00:00Z'),
    };
    this.users.set(testUser.id, testUser);
  }

  async ping(): Promise<boolean> {
    // 意図的な失敗をシミュレート
    if (this.shouldFailPing) {
      return false;
    }

    // 軽微な遅延をシミュレート
    await new Promise((resolve) => setTimeout(resolve, 10));
    return true;
  }

  async createUser(user: Omit<User, 'createdAt' | 'updatedAt'>): Promise<User> {
    const now = new Date();
    const newUser: User = {
      ...user,
      createdAt: now,
      updatedAt: now,
    };

    this.users.set(newUser.id, newUser);
    return newUser;
  }

  async getUserById(id: string): Promise<User | null> {
    return this.users.get(id) || null;
  }

  async updateLastLogin(userId: string): Promise<void> {
    const user = this.users.get(userId);
    if (user) {
      const updatedUser: User = {
        ...user,
        lastLoginAt: new Date(),
        updatedAt: new Date(),
      };
      this.users.set(userId, updatedUser);
    }
  }

  async getUser(
    accessToken: string
  ): Promise<{ id: string; email?: string } | null> {
    // モック認証トークンの処理
    if (accessToken === 'mock-access-token') {
      return {
        id: 'test-user-id',
        email: 'test@example.com',
      };
    }

    if (accessToken === 'invalid-token') {
      return null;
    }

    // デフォルトのテストユーザーを返す
    return {
      id: 'test-user-id',
      email: 'test@example.com',
    };
  }

  // テスト用のヘルパーメソッド
  setFailPing(shouldFail: boolean): void {
    this.shouldFailPing = shouldFail;
  }

  clearUsers(): void {
    this.users.clear();
  }

  addTestUser(user: User): void {
    this.users.set(user.id, user);
  }
}
