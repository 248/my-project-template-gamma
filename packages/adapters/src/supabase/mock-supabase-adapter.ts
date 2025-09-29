/**
 * モック版Supabase Adapter（開発・テスト用）
 * Windows環境での動作確認用
 */

import type { User } from '@template-gamma/core/user';
import type { Image } from '@template-gamma/core/image';
import type { SupabaseAdapter } from './types';

export class MockSupabaseAdapter implements SupabaseAdapter {
  private users = new Map<string, User>();
  private images = new Map<string, Image>();
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

  async signOut(): Promise<void> {
    // モック実装: ログアウト処理をシミュレート
    // 実際の実装では、Supabaseのセッション無効化APIを呼び出す
    await new Promise((resolve) => setTimeout(resolve, 10));
  }

  // 画像管理メソッド
  async createImage(image: Image): Promise<Image> {
    this.images.set(image.id, image);
    return image;
  }

  async getImage(imageId: string): Promise<Image | null> {
    return this.images.get(imageId) || null;
  }

  async updateImage(image: Image): Promise<Image> {
    if (!this.images.has(image.id)) {
      throw new Error(`Image with id ${image.id} not found`);
    }
    this.images.set(image.id, image);
    return image;
  }

  async deleteImage(imageId: string): Promise<void> {
    this.images.delete(imageId);
  }

  async getUserImages(
    userId: string,
    limit: number,
    offset: number
  ): Promise<{ images: Image[]; total: number }> {
    // ユーザーの画像をフィルタリング
    const userImages = Array.from(this.images.values()).filter(
      (image) => image.userId === userId
    );

    // 作成日時の降順でソート
    userImages.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    // ページネーション
    const paginatedImages = userImages.slice(offset, offset + limit);

    return {
      images: paginatedImages,
      total: userImages.length,
    };
  }

  // テスト用のヘルパーメソッド
  setFailPing(shouldFail: boolean): void {
    this.shouldFailPing = shouldFail;
  }

  clearUsers(): void {
    this.users.clear();
  }

  clearImages(): void {
    this.images.clear();
  }

  addTestUser(user: User): void {
    this.users.set(user.id, user);
  }

  addTestImage(image: Image): void {
    this.images.set(image.id, image);
  }

  getImageCount(): number {
    return this.images.size;
  }

  getUserImageCount(userId: string): number {
    return Array.from(this.images.values()).filter(
      (image) => image.userId === userId
    ).length;
  }
}
