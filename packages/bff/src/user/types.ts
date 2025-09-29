/**
 * ユーザーサービス型定義
 * 要件 10.1-10.4: ユーザー情報の永続化
 */

import type { User } from '@template-gamma/core/user';

export interface UserService {
  /**
   * ユーザーを作成または取得する
   * 要件 10.1: ユーザーが登録された時 THEN システムは DB に永続化する
   */
  createOrGetUser(userId: string): Promise<User>;

  /**
   * ユーザーIDでユーザーを取得する
   * 要件 10.4: ユーザー情報にアクセスする時 THEN システムは RLS により本人行のみ参照可能
   */
  getUserById(userId: string): Promise<User | null>;

  /**
   * ユーザーの最終ログイン時刻を更新する
   * 要件 10.2: ユーザーがログインするたび THEN システムは last_login_at を現在時刻へ更新する
   */
  updateLastLogin(userId: string): Promise<void>;

  /**
   * ユーザーがアクティブかどうかを判定する
   */
  isUserActive(userId: string, inactiveDays?: number): Promise<boolean>;

  /**
   * ユーザーの統計情報を取得する
   */
  getUserStats(userId: string): Promise<UserStats>;
}

export interface UserStats {
  /** 登録からの経過日数 */
  ageDays: number;
  /** 最終ログインからの経過日数 */
  daysSinceLastLogin: number;
  /** アクティブユーザーかどうか */
  isActive: boolean;
}

export interface CreateUserRequest {
  userId: string;
}

export interface UpdateLastLoginRequest {
  userId: string;
}

export interface GetUserStatsRequest {
  userId: string;
  inactiveDays?: number;
}
