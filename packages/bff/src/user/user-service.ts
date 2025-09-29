/**
 * ユーザーサービス実装
 * 要件 10.1-10.4: ユーザー情報の永続化
 */

import {
  createUser,
  validateUserId,
  isUserActive as isUserActiveCore,
  getUserAgeDays,
  getDaysSinceLastLogin,
  type User,
} from '@template-gamma/core/user';
import type { SupabaseAdapter } from '@template-gamma/adapters/supabase';
import type { Logger } from '@template-gamma/adapters/logger';
import { ValidationError, NotFoundError } from '../error-handler.js';
import type { UserService, UserStats } from './types.js';

export class UserServiceImpl implements UserService {
  constructor(
    private supabaseAdapter: SupabaseAdapter,
    private logger: Logger
  ) {}

  async createOrGetUser(userId: string): Promise<User> {
    this.logger.info({ userId }, 'Creating or getting user');

    // バリデーション
    const validationErrors = validateUserId(userId);
    if (validationErrors.length > 0) {
      throw new ValidationError('Invalid user ID', {
        errors: validationErrors,
      });
    }

    try {
      // 既存ユーザーを確認
      const existingUser = await this.supabaseAdapter.getUserById(userId);
      if (existingUser) {
        this.logger.info({ userId }, 'User already exists');
        return existingUser;
      }

      // 新規ユーザー作成
      const newUserData = createUser({ id: userId });
      const createdUser = await this.supabaseAdapter.createUser(newUserData);

      this.logger.info({ userId }, 'User created successfully');
      return createdUser;
    } catch (error) {
      this.logger.error({ err: error, userId }, 'Failed to create or get user');
      throw error;
    }
  }

  async getUserById(userId: string): Promise<User | null> {
    this.logger.info({ userId }, 'Getting user by ID');

    // バリデーション
    const validationErrors = validateUserId(userId);
    if (validationErrors.length > 0) {
      throw new ValidationError('Invalid user ID', {
        errors: validationErrors,
      });
    }

    try {
      const user = await this.supabaseAdapter.getUserById(userId);

      if (user) {
        this.logger.info({ userId }, 'User found');
      } else {
        this.logger.info({ userId }, 'User not found');
      }

      return user;
    } catch (error) {
      this.logger.error({ err: error, userId }, 'Failed to get user');
      throw error;
    }
  }

  async updateLastLogin(userId: string): Promise<void> {
    this.logger.info({ userId }, 'Updating last login');

    // バリデーション
    const validationErrors = validateUserId(userId);
    if (validationErrors.length > 0) {
      throw new ValidationError('Invalid user ID', {
        errors: validationErrors,
      });
    }

    try {
      // ユーザーの存在確認
      const user = await this.supabaseAdapter.getUserById(userId);
      if (!user) {
        throw new NotFoundError('User not found');
      }

      // 最終ログイン時刻を更新
      await this.supabaseAdapter.updateLastLogin(userId);

      this.logger.info({ userId }, 'Last login updated successfully');
    } catch (error) {
      this.logger.error({ err: error, userId }, 'Failed to update last login');
      throw error;
    }
  }

  async isUserActive(
    userId: string,
    inactiveDays: number = 30
  ): Promise<boolean> {
    this.logger.info({ userId, inactiveDays }, 'Checking if user is active');

    // バリデーション
    const validationErrors = validateUserId(userId);
    if (validationErrors.length > 0) {
      throw new ValidationError('Invalid user ID', {
        errors: validationErrors,
      });
    }

    try {
      const user = await this.supabaseAdapter.getUserById(userId);
      if (!user) {
        throw new NotFoundError('User not found');
      }

      const isActive = isUserActiveCore(user, inactiveDays);

      this.logger.info(
        { userId, isActive, inactiveDays },
        'User activity checked'
      );
      return isActive;
    } catch (error) {
      this.logger.error(
        { err: error, userId },
        'Failed to check user activity'
      );
      throw error;
    }
  }

  async getUserStats(userId: string): Promise<UserStats> {
    this.logger.info({ userId }, 'Getting user stats');

    // バリデーション
    const validationErrors = validateUserId(userId);
    if (validationErrors.length > 0) {
      throw new ValidationError('Invalid user ID', {
        errors: validationErrors,
      });
    }

    try {
      const user = await this.supabaseAdapter.getUserById(userId);
      if (!user) {
        throw new NotFoundError('User not found');
      }

      const stats: UserStats = {
        ageDays: getUserAgeDays(user),
        daysSinceLastLogin: getDaysSinceLastLogin(user),
        isActive: isUserActiveCore(user),
      };

      this.logger.info({ userId, stats }, 'User stats retrieved');
      return stats;
    } catch (error) {
      this.logger.error({ err: error, userId }, 'Failed to get user stats');
      throw error;
    }
  }
}
