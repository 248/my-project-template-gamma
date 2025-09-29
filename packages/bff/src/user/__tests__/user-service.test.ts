/**
 * ユーザーサービスのテスト
 * 要件 10.1-10.4: ユーザー情報の永続化
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UserServiceImpl } from '../user-service.js';
import { ValidationError, NotFoundError } from '../../error-handler.js';
import type { SupabaseAdapter } from '@template-gamma/adapters/supabase';
import type { Logger } from '@template-gamma/adapters/logger';
import type { User } from '@template-gamma/core/user';

// モックの作成
const mockSupabaseAdapter: SupabaseAdapter = {
  ping: vi.fn(),
  createUser: vi.fn(),
  getUserById: vi.fn(),
  updateLastLogin: vi.fn(),
  getUser: vi.fn(),
};

const mockLogger: Logger = {
  info: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  debug: vi.fn(),
};

describe('UserServiceImpl', () => {
  let userService: UserServiceImpl;
  let testUser: User;

  beforeEach(() => {
    userService = new UserServiceImpl(mockSupabaseAdapter, mockLogger);

    testUser = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      createdAt: new Date('2024-01-01T00:00:00Z'),
      updatedAt: new Date('2024-01-01T00:00:00Z'),
      lastLoginAt: new Date('2024-01-01T00:00:00Z'),
    };

    // モックをリセット
    vi.clearAllMocks();
  });

  describe('createOrGetUser', () => {
    it('既存ユーザーが存在する場合は取得する', async () => {
      // Arrange
      vi.mocked(mockSupabaseAdapter.getUserById).mockResolvedValue(testUser);

      // Act
      const result = await userService.createOrGetUser(testUser.id);

      // Assert
      expect(result).toEqual(testUser);
      expect(mockSupabaseAdapter.getUserById).toHaveBeenCalledWith(testUser.id);
      expect(mockSupabaseAdapter.createUser).not.toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith(
        { userId: testUser.id },
        'User already exists'
      );
    });

    it('新規ユーザーを作成する', async () => {
      // Arrange
      vi.mocked(mockSupabaseAdapter.getUserById).mockResolvedValue(null);
      vi.mocked(mockSupabaseAdapter.createUser).mockResolvedValue(testUser);

      // Act
      const result = await userService.createOrGetUser(testUser.id);

      // Assert
      expect(result).toEqual(testUser);
      expect(mockSupabaseAdapter.getUserById).toHaveBeenCalledWith(testUser.id);
      expect(mockSupabaseAdapter.createUser).toHaveBeenCalledWith(
        expect.objectContaining({
          id: testUser.id,
        })
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        { userId: testUser.id },
        'User created successfully'
      );
    });

    it('無効なユーザーIDの場合はValidationErrorを投げる', async () => {
      // Act & Assert
      await expect(userService.createOrGetUser('')).rejects.toThrow(
        ValidationError
      );
      await expect(userService.createOrGetUser('invalid-uuid')).rejects.toThrow(
        ValidationError
      );
    });

    it('データベースエラーが発生した場合はエラーを再投げする', async () => {
      // Arrange
      const dbError = new Error('Database connection failed');
      vi.mocked(mockSupabaseAdapter.getUserById).mockRejectedValue(dbError);

      // Act & Assert
      await expect(userService.createOrGetUser(testUser.id)).rejects.toThrow(
        dbError
      );
      expect(mockLogger.error).toHaveBeenCalledWith(
        { err: dbError, userId: testUser.id },
        'Failed to create or get user'
      );
    });
  });

  describe('getUserById', () => {
    it('ユーザーが存在する場合は取得する', async () => {
      // Arrange
      vi.mocked(mockSupabaseAdapter.getUserById).mockResolvedValue(testUser);

      // Act
      const result = await userService.getUserById(testUser.id);

      // Assert
      expect(result).toEqual(testUser);
      expect(mockSupabaseAdapter.getUserById).toHaveBeenCalledWith(testUser.id);
      expect(mockLogger.info).toHaveBeenCalledWith(
        { userId: testUser.id },
        'User found'
      );
    });

    it('ユーザーが存在しない場合はnullを返す', async () => {
      // Arrange
      vi.mocked(mockSupabaseAdapter.getUserById).mockResolvedValue(null);

      // Act
      const result = await userService.getUserById(testUser.id);

      // Assert
      expect(result).toBeNull();
      expect(mockLogger.info).toHaveBeenCalledWith(
        { userId: testUser.id },
        'User not found'
      );
    });

    it('無効なユーザーIDの場合はValidationErrorを投げる', async () => {
      // Act & Assert
      await expect(userService.getUserById('')).rejects.toThrow(
        ValidationError
      );
    });
  });

  describe('updateLastLogin', () => {
    it('最終ログイン時刻を更新する', async () => {
      // Arrange
      vi.mocked(mockSupabaseAdapter.getUserById).mockResolvedValue(testUser);
      vi.mocked(mockSupabaseAdapter.updateLastLogin).mockResolvedValue();

      // Act
      await userService.updateLastLogin(testUser.id);

      // Assert
      expect(mockSupabaseAdapter.getUserById).toHaveBeenCalledWith(testUser.id);
      expect(mockSupabaseAdapter.updateLastLogin).toHaveBeenCalledWith(
        testUser.id
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        { userId: testUser.id },
        'Last login updated successfully'
      );
    });

    it('ユーザーが存在しない場合はNotFoundErrorを投げる', async () => {
      // Arrange
      vi.mocked(mockSupabaseAdapter.getUserById).mockResolvedValue(null);

      // Act & Assert
      await expect(userService.updateLastLogin(testUser.id)).rejects.toThrow(
        NotFoundError
      );
    });

    it('無効なユーザーIDの場合はValidationErrorを投げる', async () => {
      // Act & Assert
      await expect(userService.updateLastLogin('')).rejects.toThrow(
        ValidationError
      );
    });
  });

  describe('isUserActive', () => {
    it('アクティブなユーザーの場合はtrueを返す', async () => {
      // Arrange
      const activeUser = {
        ...testUser,
        lastLoginAt: new Date(), // 現在時刻
      };
      vi.mocked(mockSupabaseAdapter.getUserById).mockResolvedValue(activeUser);

      // Act
      const result = await userService.isUserActive(testUser.id);

      // Assert
      expect(result).toBe(true);
      expect(mockLogger.info).toHaveBeenCalledWith(
        { userId: testUser.id, isActive: true, inactiveDays: 30 },
        'User activity checked'
      );
    });

    it('非アクティブなユーザーの場合はfalseを返す', async () => {
      // Arrange
      const inactiveUser = {
        ...testUser,
        lastLoginAt: new Date('2023-01-01T00:00:00Z'), // 古い日付
      };
      vi.mocked(mockSupabaseAdapter.getUserById).mockResolvedValue(
        inactiveUser
      );

      // Act
      const result = await userService.isUserActive(testUser.id);

      // Assert
      expect(result).toBe(false);
      expect(mockLogger.info).toHaveBeenCalledWith(
        { userId: testUser.id, isActive: false, inactiveDays: 30 },
        'User activity checked'
      );
    });

    it('カスタムの非アクティブ日数を使用する', async () => {
      // Arrange
      vi.mocked(mockSupabaseAdapter.getUserById).mockResolvedValue(testUser);

      // Act
      await userService.isUserActive(testUser.id, 7);

      // Assert
      expect(mockLogger.info).toHaveBeenCalledWith(
        { userId: testUser.id, isActive: expect.any(Boolean), inactiveDays: 7 },
        'User activity checked'
      );
    });

    it('ユーザーが存在しない場合はNotFoundErrorを投げる', async () => {
      // Arrange
      vi.mocked(mockSupabaseAdapter.getUserById).mockResolvedValue(null);

      // Act & Assert
      await expect(userService.isUserActive(testUser.id)).rejects.toThrow(
        NotFoundError
      );
    });
  });

  describe('getUserStats', () => {
    it('ユーザー統計情報を取得する', async () => {
      // Arrange
      const now = new Date();
      const userWithKnownDates = {
        ...testUser,
        createdAt: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000), // 10日前
        lastLoginAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000), // 2日前
      };
      vi.mocked(mockSupabaseAdapter.getUserById).mockResolvedValue(
        userWithKnownDates
      );

      // Act
      const result = await userService.getUserStats(testUser.id);

      // Assert
      expect(result).toEqual({
        ageDays: expect.any(Number),
        daysSinceLastLogin: expect.any(Number),
        isActive: expect.any(Boolean),
      });
      expect(result.ageDays).toBeGreaterThanOrEqual(10);
      expect(result.daysSinceLastLogin).toBeGreaterThanOrEqual(2);
      expect(mockLogger.info).toHaveBeenCalledWith(
        { userId: testUser.id, stats: result },
        'User stats retrieved'
      );
    });

    it('ユーザーが存在しない場合はNotFoundErrorを投げる', async () => {
      // Arrange
      vi.mocked(mockSupabaseAdapter.getUserById).mockResolvedValue(null);

      // Act & Assert
      await expect(userService.getUserStats(testUser.id)).rejects.toThrow(
        NotFoundError
      );
    });

    it('無効なユーザーIDの場合はValidationErrorを投げる', async () => {
      // Act & Assert
      await expect(userService.getUserStats('')).rejects.toThrow(
        ValidationError
      );
    });
  });
});
