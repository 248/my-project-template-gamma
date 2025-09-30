/**
 * ユーザーサービス統合テスト（モックアダプタ使用）
 * Windows環境でのモックデータベースでのCRUD操作確認
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { UserServiceImpl } from '../user-service.js';
import { MockSupabaseAdapter } from '@template-gamma/adapters/supabase';
import { MockLogger } from '@template-gamma/adapters/logger';
import { ValidationError, NotFoundError } from '../../error-handler.js';
// import type { User } from '@template-gamma/core/user';

describe('UserService Integration Tests (Mock)', () => {
  let userService: UserServiceImpl;
  let mockAdapter: MockSupabaseAdapter;
  let mockLogger: MockLogger;

  beforeEach(() => {
    mockAdapter = new MockSupabaseAdapter();
    mockLogger = new MockLogger();
    userService = new UserServiceImpl(mockAdapter, mockLogger);

    // テスト用データをクリア
    mockAdapter.clearUsers();
  });

  describe('完全なユーザーライフサイクル', () => {
    const testUserId = '550e8400-e29b-41d4-a716-446655440000';

    it('新規ユーザー作成から統計取得まで', async () => {
      // 1. 新規ユーザー作成
      const createdUser = await userService.createOrGetUser(testUserId);
      expect(createdUser.id).toBe(testUserId);
      expect(createdUser.createdAt).toBeInstanceOf(Date);
      expect(createdUser.updatedAt).toBeInstanceOf(Date);
      expect(createdUser.lastLoginAt).toBeInstanceOf(Date);

      // 2. 作成したユーザーを取得
      const retrievedUser = await userService.getUserById(testUserId);
      expect(retrievedUser).toEqual(createdUser);

      // 3. 最終ログイン時刻を更新
      await userService.updateLastLogin(testUserId);

      // 4. 更新後のユーザーを取得して確認
      const updatedUser = await userService.getUserById(testUserId);
      expect(updatedUser!.lastLoginAt.getTime()).toBeGreaterThan(
        createdUser.lastLoginAt.getTime()
      );

      // 5. ユーザーがアクティブかどうか確認
      const isActive = await userService.isUserActive(testUserId);
      expect(isActive).toBe(true);

      // 6. ユーザー統計情報を取得
      const stats = await userService.getUserStats(testUserId);
      expect(stats.ageDays).toBeGreaterThanOrEqual(0);
      expect(stats.daysSinceLastLogin).toBeGreaterThanOrEqual(0);
      expect(stats.isActive).toBe(true);
    });

    it('既存ユーザーの場合は作成せずに取得する', async () => {
      // 1. 最初のユーザー作成
      const firstUser = await userService.createOrGetUser(testUserId);

      // 2. 同じIDで再度呼び出し
      const secondUser = await userService.createOrGetUser(testUserId);

      // 3. 同じユーザーオブジェクトが返されることを確認
      expect(secondUser).toEqual(firstUser);
    });
  });

  describe('エラーハンドリング', () => {
    it('無効なUUID形式のユーザーIDでValidationErrorが発生する', async () => {
      const invalidUserIds = [
        '',
        'invalid-uuid',
        '123',
        'not-a-uuid-at-all',
        '550e8400-e29b-41d4-a716', // 短すぎる
      ];

      for (const invalidId of invalidUserIds) {
        await expect(userService.createOrGetUser(invalidId)).rejects.toThrow(
          ValidationError
        );
        await expect(userService.getUserById(invalidId)).rejects.toThrow(
          ValidationError
        );
        await expect(userService.updateLastLogin(invalidId)).rejects.toThrow(
          ValidationError
        );
        await expect(userService.isUserActive(invalidId)).rejects.toThrow(
          ValidationError
        );
        await expect(userService.getUserStats(invalidId)).rejects.toThrow(
          ValidationError
        );
      }
    });

    it('存在しないユーザーに対する操作でNotFoundErrorが発生する', async () => {
      const nonExistentUserId = '550e8400-e29b-41d4-a716-446655440001';

      // getUserByIdはnullを返す（NotFoundErrorではない）
      const user = await userService.getUserById(nonExistentUserId);
      expect(user).toBeNull();

      // その他の操作はNotFoundErrorを投げる
      await expect(
        userService.updateLastLogin(nonExistentUserId)
      ).rejects.toThrow(NotFoundError);
      await expect(userService.isUserActive(nonExistentUserId)).rejects.toThrow(
        NotFoundError
      );
      await expect(userService.getUserStats(nonExistentUserId)).rejects.toThrow(
        NotFoundError
      );
    });
  });

  describe('アクティビティ判定', () => {
    const testUserId = '550e8400-e29b-41d4-a716-446655440000';

    it('カスタム非アクティブ日数での判定', async () => {
      // ユーザーを作成
      await userService.createOrGetUser(testUserId);

      // 短い期間（1日）でのアクティビティ判定
      const isActiveShort = await userService.isUserActive(testUserId, 1);
      expect(isActiveShort).toBe(true); // 作成直後なのでアクティブ

      // 長い期間（365日）でのアクティビティ判定
      const isActiveLong = await userService.isUserActive(testUserId, 365);
      expect(isActiveLong).toBe(true); // 作成直後なのでアクティブ
    });
  });

  describe('統計情報の正確性', () => {
    const testUserId = '550e8400-e29b-41d4-a716-446655440000';

    it('統計情報が正確に計算される', async () => {
      // ユーザーを作成
      await userService.createOrGetUser(testUserId);

      // 統計情報を取得
      const stats = await userService.getUserStats(testUserId);

      // 作成直後なので経過日数は0
      expect(stats.ageDays).toBe(0);
      expect(stats.daysSinceLastLogin).toBe(0);
      expect(stats.isActive).toBe(true);
    });
  });

  describe('並行処理', () => {
    it('複数のユーザーを並行して作成できる', async () => {
      const userIds = [
        '550e8400-e29b-41d4-a716-446655440001',
        '550e8400-e29b-41d4-a716-446655440002',
        '550e8400-e29b-41d4-a716-446655440003',
      ];

      // 並行してユーザーを作成
      const users = await Promise.all(
        userIds.map((id) => userService.createOrGetUser(id))
      );

      // 全てのユーザーが正常に作成されることを確認
      expect(users).toHaveLength(3);
      users.forEach((user, index) => {
        expect(user.id).toBe(userIds[index]);
      });

      // 並行して統計情報を取得
      const stats = await Promise.all(
        userIds.map((id) => userService.getUserStats(id))
      );

      // 全ての統計情報が正常に取得されることを確認
      expect(stats).toHaveLength(3);
      stats.forEach((stat) => {
        expect(stat.ageDays).toBeGreaterThanOrEqual(0);
        expect(stat.daysSinceLastLogin).toBeGreaterThanOrEqual(0);
        expect(stat.isActive).toBe(true);
      });
    });
  });
});
