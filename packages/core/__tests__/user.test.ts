import { describe, it, expect } from 'vitest';
import {
  createUser,
  updateLastLogin,
  updateUser,
  validateUserId,
  validateUser,
  isUserActive,
  getUserAgeDays,
  getDaysSinceLastLogin,
  type User,
} from '../user';

describe('user', () => {
  const mockUserId = '12345678-1234-1234-1234-123456789012';

  describe('createUser', () => {
    it('新しいユーザーを正しく作成する', () => {
      const input = { id: mockUserId };
      const user = createUser(input);

      expect(user.id).toBe(mockUserId);
      expect(user.createdAt).toBeInstanceOf(Date);
      expect(user.updatedAt).toBeInstanceOf(Date);
      expect(user.lastLoginAt).toBeInstanceOf(Date);

      // 作成時は全ての日時が同じ
      expect(user.createdAt.getTime()).toBe(user.updatedAt.getTime());
      expect(user.createdAt.getTime()).toBe(user.lastLoginAt.getTime());
    });
  });

  describe('updateLastLogin', () => {
    it('最終ログイン時刻を更新する', () => {
      const originalUser: User = {
        id: mockUserId,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
        lastLoginAt: new Date('2024-01-01'),
      };

      const updatedUser = updateLastLogin(originalUser);

      expect(updatedUser.id).toBe(originalUser.id);
      expect(updatedUser.createdAt).toEqual(originalUser.createdAt);
      expect(updatedUser.lastLoginAt.getTime()).toBeGreaterThan(
        originalUser.lastLoginAt.getTime()
      );
      expect(updatedUser.updatedAt.getTime()).toBeGreaterThan(
        originalUser.updatedAt.getTime()
      );
    });

    it('指定した時刻で最終ログイン時刻を更新する', () => {
      const originalUser: User = {
        id: mockUserId,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
        lastLoginAt: new Date('2024-01-01'),
      };

      const loginTime = new Date('2024-02-01');
      const updatedUser = updateLastLogin(originalUser, loginTime);

      expect(updatedUser.lastLoginAt).toEqual(loginTime);
    });
  });

  describe('updateUser', () => {
    it('ユーザー情報を更新する', () => {
      const originalUser: User = {
        id: mockUserId,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
        lastLoginAt: new Date('2024-01-01'),
      };

      const newLoginTime = new Date('2024-02-01');
      const updatedUser = updateUser(originalUser, {
        id: mockUserId,
        lastLoginAt: newLoginTime,
      });

      expect(updatedUser.lastLoginAt).toEqual(newLoginTime);
      expect(updatedUser.updatedAt.getTime()).toBeGreaterThan(
        originalUser.updatedAt.getTime()
      );
    });
  });

  describe('validateUserId', () => {
    it('有効なUUIDの場合は空の配列を返す', () => {
      const errors = validateUserId(mockUserId);
      expect(errors).toEqual([]);
    });

    it('空文字列の場合はエラーを返す', () => {
      const errors = validateUserId('');
      expect(errors).toHaveLength(1);
      expect(errors[0].field).toBe('id');
      expect(errors[0].message).toContain('必須');
    });

    it('無効なUUID形式の場合はエラーを返す', () => {
      const errors = validateUserId('invalid-uuid');
      expect(errors).toHaveLength(1);
      expect(errors[0].field).toBe('id');
      expect(errors[0].message).toContain('UUID形式');
    });

    it('空白文字のみの場合はエラーを返す', () => {
      const errors = validateUserId('   ');
      expect(errors.length).toBeGreaterThan(0);
      expect(
        errors.some((e) => e.field === 'id' && e.message.includes('空文字列'))
      ).toBe(true);
    });
  });

  describe('validateUser', () => {
    it('有効なユーザーの場合は空の配列を返す', () => {
      const user: User = {
        id: mockUserId,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-02'),
        lastLoginAt: new Date('2024-01-03'),
      };

      const errors = validateUser(user);
      expect(errors).toEqual([]);
    });

    it('無効な日付の場合はエラーを返す', () => {
      const user: User = {
        id: mockUserId,
        createdAt: new Date('invalid'),
        updatedAt: new Date('2024-01-02'),
        lastLoginAt: new Date('2024-01-03'),
      };

      const errors = validateUser(user);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.field === 'createdAt')).toBe(true);
    });

    it('更新日時が作成日時より前の場合はエラーを返す', () => {
      const user: User = {
        id: mockUserId,
        createdAt: new Date('2024-01-02'),
        updatedAt: new Date('2024-01-01'),
        lastLoginAt: new Date('2024-01-03'),
      };

      const errors = validateUser(user);
      expect(
        errors.some(
          (e) => e.field === 'updatedAt' && e.message.includes('以降')
        )
      ).toBe(true);
    });
  });

  describe('isUserActive', () => {
    it('最近ログインしたユーザーはアクティブと判定する', () => {
      const user: User = {
        id: mockUserId,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
        lastLoginAt: new Date(), // 現在時刻
      };

      expect(isUserActive(user)).toBe(true);
    });

    it('長期間ログインしていないユーザーは非アクティブと判定する', () => {
      const user: User = {
        id: mockUserId,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
        lastLoginAt: new Date('2024-01-01'), // 古い日付
      };

      expect(isUserActive(user)).toBe(false);
    });

    it('カスタムの非アクティブ日数を使用できる', () => {
      const user: User = {
        id: mockUserId,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
        lastLoginAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10日前
      };

      expect(isUserActive(user, 7)).toBe(false); // 7日以内でチェック
      expect(isUserActive(user, 14)).toBe(true); // 14日以内でチェック
    });
  });

  describe('getUserAgeDays', () => {
    it('ユーザーの登録からの経過日数を正しく計算する', () => {
      const user: User = {
        id: mockUserId,
        createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10日前
        updatedAt: new Date(),
        lastLoginAt: new Date(),
      };

      const ageDays = getUserAgeDays(user);
      expect(ageDays).toBe(10);
    });
  });

  describe('getDaysSinceLastLogin', () => {
    it('最終ログインからの経過日数を正しく計算する', () => {
      const user: User = {
        id: mockUserId,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5日前
      };

      const daysSinceLogin = getDaysSinceLastLogin(user);
      expect(daysSinceLogin).toBe(5);
    });
  });
});
