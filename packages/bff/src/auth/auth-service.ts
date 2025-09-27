/**
 * 認証サービス
 * 要件 2.1-2.6: 認証システム
 * 要件 6.1-6.6: セキュリティとセッション管理
 */

import {
  User,
  createUser,
  updateLastLogin,
  validateUserId,
} from '@template-gamma/core/user';
import { SupabaseAdapter, Logger } from '@template-gamma/adapters';
import {
  BffError,
  AuthError,
  ValidationError,
  ERROR_CODES,
} from '../error-handler.js';

/**
 * ログイン結果
 */
export interface LoginResult {
  redirectUrl: string;
}

/**
 * コールバック結果
 */
export interface CallbackResult {
  user: User;
  redirectUrl: string;
}

/**
 * セッション情報
 */
export interface SessionInfo {
  userId: string;
  accessToken: string;
  refreshToken?: string;
  expiresAt: Date;
}

/**
 * 認証サービスインターフェース
 */
export interface AuthService {
  initiateLogin(provider: string, redirectTo?: string): Promise<LoginResult>;
  handleCallback(code: string, state?: string): Promise<CallbackResult>;
  logout(sessionId: string): Promise<void>;
  getCurrentUser(sessionId: string): Promise<User | null>;
  refreshSession(refreshToken: string): Promise<SessionInfo>;
  validateSession(accessToken: string): Promise<User | null>;
}

/**
 * 認証サービス実装
 */
export class AuthServiceImpl implements AuthService {
  constructor(
    private supabaseAdapter: SupabaseAdapter,
    private logger: Logger
  ) {}

  /**
   * OAuth認証を開始する
   * 要件 2.3: Supabase OAuth 認証を開始する
   */
  async initiateLogin(
    provider: string = 'google',
    redirectTo: string = '/home'
  ): Promise<LoginResult> {
    this.logger.info({ provider, redirectTo }, 'Initiating OAuth login');

    try {
      // プロバイダーの検証
      if (!this.isValidProvider(provider)) {
        throw new ValidationError(`Unsupported OAuth provider: ${provider}`);
      }

      // Supabase OAuth URLを生成
      const redirectUrl = await this.supabaseAdapter.getOAuthUrl(provider, {
        redirectTo,
      });

      this.logger.info({ provider, redirectUrl }, 'OAuth login initiated');

      return { redirectUrl };
    } catch (error) {
      this.logger.error(
        { err: error, provider },
        'Failed to initiate OAuth login'
      );

      if (error instanceof ValidationError) {
        throw error;
      }

      throw new AuthError(
        ERROR_CODES.AUTH_CALLBACK_FAILED,
        'Failed to initiate OAuth login'
      );
    }
  }

  /**
   * OAuth認証コールバックを処理する
   * 要件 2.4: セッションを発行し /home にリダイレクトする
   */
  async handleCallback(code: string, state?: string): Promise<CallbackResult> {
    this.logger.info(
      { hasCode: !!code, hasState: !!state },
      'Handling OAuth callback'
    );

    try {
      if (!code) {
        throw new ValidationError('Authorization code is required');
      }

      // Supabaseでトークン交換
      const authResult =
        await this.supabaseAdapter.exchangeCodeForSession(code);

      if (!authResult.user) {
        throw new AuthError(
          ERROR_CODES.AUTH_CALLBACK_FAILED,
          'Failed to get user from OAuth callback'
        );
      }

      // ユーザーIDの検証
      const userIdErrors = validateUserId(authResult.user.id);
      if (userIdErrors.length > 0) {
        this.logger.error(
          { errors: userIdErrors },
          'Invalid user ID from OAuth'
        );
        throw new ValidationError('Invalid user ID from OAuth provider');
      }

      // ユーザー情報の永続化または更新
      let user: User;
      const existingUser = await this.supabaseAdapter.getUser(
        authResult.user.id
      );

      if (existingUser) {
        // 既存ユーザーの最終ログイン時刻を更新
        user = updateLastLogin(existingUser);
        await this.supabaseAdapter.updateUser(user);
        this.logger.info(
          { userId: user.id },
          'Updated existing user login time'
        );
      } else {
        // 新規ユーザーを作成
        user = createUser({ id: authResult.user.id });
        await this.supabaseAdapter.createUser(user);
        this.logger.info({ userId: user.id }, 'Created new user');
      }

      const redirectUrl = '/home';

      this.logger.info(
        { userId: user.id, redirectUrl },
        'OAuth callback handled successfully'
      );

      return { user, redirectUrl };
    } catch (error) {
      this.logger.error({ err: error }, 'Failed to handle OAuth callback');

      if (error instanceof ValidationError || error instanceof AuthError) {
        throw error;
      }

      throw new AuthError(
        ERROR_CODES.AUTH_CALLBACK_FAILED,
        'Failed to process OAuth callback'
      );
    }
  }

  /**
   * ログアウト処理
   * 要件 2.6: セッションを削除する
   */
  async logout(sessionId: string): Promise<void> {
    this.logger.info({ sessionId }, 'Processing logout');

    try {
      if (!sessionId) {
        throw new ValidationError('Session ID is required');
      }

      // Supabaseセッションを無効化
      await this.supabaseAdapter.signOut(sessionId);

      this.logger.info({ sessionId }, 'User logged out successfully');
    } catch (error) {
      this.logger.error({ err: error, sessionId }, 'Failed to logout user');

      if (error instanceof ValidationError) {
        throw error;
      }

      throw new BffError(ERROR_CODES.INTERNAL_ERROR, 'Failed to logout user');
    }
  }

  /**
   * 現在のユーザーを取得
   * 要件 6.1: Supabase Auth Cookie を利用する
   */
  async getCurrentUser(sessionId: string): Promise<User | null> {
    this.logger.debug({ sessionId }, 'Getting current user');

    try {
      if (!sessionId) {
        return null;
      }

      // セッションからユーザー情報を取得
      const authUser = await this.supabaseAdapter.getUserFromSession(sessionId);

      if (!authUser) {
        return null;
      }

      // データベースからユーザー情報を取得
      const user = await this.supabaseAdapter.getUser(authUser.id);

      if (!user) {
        this.logger.warn(
          { userId: authUser.id },
          'User exists in auth but not in database'
        );
        return null;
      }

      return user;
    } catch (error) {
      this.logger.error(
        { err: error, sessionId },
        'Failed to get current user'
      );
      return null;
    }
  }

  /**
   * セッションを更新
   */
  async refreshSession(refreshToken: string): Promise<SessionInfo> {
    this.logger.info('Refreshing session');

    try {
      if (!refreshToken) {
        throw new ValidationError('Refresh token is required');
      }

      const result = await this.supabaseAdapter.refreshSession(refreshToken);

      if (!result.session) {
        throw new AuthError(
          ERROR_CODES.AUTH_EXPIRED,
          'Failed to refresh session'
        );
      }

      return {
        userId: result.session.user.id,
        accessToken: result.session.access_token,
        refreshToken: result.session.refresh_token,
        expiresAt: new Date(result.session.expires_at! * 1000),
      };
    } catch (error) {
      this.logger.error({ err: error }, 'Failed to refresh session');

      if (error instanceof ValidationError || error instanceof AuthError) {
        throw error;
      }

      throw new AuthError(
        ERROR_CODES.AUTH_EXPIRED,
        'Failed to refresh session'
      );
    }
  }

  /**
   * セッションを検証
   */
  async validateSession(accessToken: string): Promise<User | null> {
    this.logger.debug('Validating session');

    try {
      if (!accessToken) {
        return null;
      }

      const authUser = await this.supabaseAdapter.getUserFromToken(accessToken);

      if (!authUser) {
        return null;
      }

      const user = await this.supabaseAdapter.getUser(authUser.id);
      return user;
    } catch (error) {
      this.logger.error({ err: error }, 'Failed to validate session');
      return null;
    }
  }

  /**
   * サポートされているOAuthプロバイダーかチェック
   */
  private isValidProvider(provider: string): boolean {
    const supportedProviders = ['google', 'github', 'discord'];
    return supportedProviders.includes(provider.toLowerCase());
  }
}

/**
 * 認証サービスファクトリー
 */
export class AuthServiceFactory {
  static create(supabaseAdapter: SupabaseAdapter, logger: Logger): AuthService {
    return new AuthServiceImpl(supabaseAdapter, logger);
  }
}
