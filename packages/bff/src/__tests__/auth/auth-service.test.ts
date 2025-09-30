/**
 * 認証サービスのテスト
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AuthServiceImpl } from '../../auth/auth-service.js';
import { ValidationError, AuthError } from '../../error-handler.js';
import {
  createMockSupabaseAdapter,
  createMockLogger,
  mockUser,
} from '../helpers/mocks.js';

describe('AuthServiceImpl', () => {
  let authService: AuthServiceImpl;
  let mockSupabaseAdapter: ReturnType<typeof createMockSupabaseAdapter>;
  let mockLogger: ReturnType<typeof createMockLogger>;

  beforeEach(() => {
    mockSupabaseAdapter = createMockSupabaseAdapter();
    mockLogger = createMockLogger();

    authService = new AuthServiceImpl(mockSupabaseAdapter, mockLogger);
  });

  describe('initiateLogin', () => {
    it('should return OAuth redirect URL for valid provider', async () => {
      const result = await authService.initiateLogin('google', '/home');

      expect(result).toEqual({
        redirectUrl: 'https://oauth.example.com/auth',
      });

      expect(mockSupabaseAdapter.getOAuthUrl).toHaveBeenCalledWith('google', {
        redirectTo: '/home',
      });

      expect(mockLogger.info).toHaveBeenCalledWith(
        { provider: 'google', redirectTo: '/home' },
        'Initiating OAuth login'
      );
    });

    it('should use default redirect URL when not provided', async () => {
      await authService.initiateLogin('google');

      expect(mockSupabaseAdapter.getOAuthUrl).toHaveBeenCalledWith('google', {
        redirectTo: '/home',
      });
    });

    it('should throw ValidationError for unsupported provider', async () => {
      await expect(authService.initiateLogin('unsupported')).rejects.toThrow(
        ValidationError
      );
      await expect(authService.initiateLogin('unsupported')).rejects.toThrow(
        'Unsupported OAuth provider: unsupported'
      );
    });

    it('should throw AuthError when OAuth URL generation fails', async () => {
      mockSupabaseAdapter.getOAuthUrl = vi
        .fn()
        .mockRejectedValue(new Error('OAuth URL generation failed'));

      await expect(authService.initiateLogin('google')).rejects.toThrow(
        AuthError
      );
      await expect(authService.initiateLogin('google')).rejects.toThrow(
        'Failed to initiate OAuth login'
      );
    });
  });

  describe('handleCallback', () => {
    it('should handle OAuth callback for new user', async () => {
      mockSupabaseAdapter.getUser = vi.fn().mockResolvedValue(null); // 新規ユーザー

      const result = await authService.handleCallback('auth-code');

      expect(result).toEqual({
        user: expect.objectContaining({
          id: mockUser.id,
        }),
        redirectUrl: '/home',
      });

      expect(mockSupabaseAdapter.exchangeCodeForSession).toHaveBeenCalledWith(
        'auth-code'
      );
      expect(mockSupabaseAdapter.createUser).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith(
        { userId: mockUser.id },
        'Created new user'
      );
    });

    it('should handle OAuth callback for existing user', async () => {
      const result = await authService.handleCallback('auth-code');

      expect(result).toEqual({
        user: expect.objectContaining({
          id: mockUser.id,
        }),
        redirectUrl: '/home',
      });

      expect(mockSupabaseAdapter.exchangeCodeForSession).toHaveBeenCalledWith(
        'auth-code'
      );
      expect(mockSupabaseAdapter.updateUser).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith(
        { userId: mockUser.id },
        'Updated existing user login time'
      );
    });

    it('should throw ValidationError when code is missing', async () => {
      await expect(authService.handleCallback('')).rejects.toThrow(
        ValidationError
      );
      await expect(authService.handleCallback('')).rejects.toThrow(
        'Authorization code is required'
      );
    });

    it('should throw AuthError when token exchange fails', async () => {
      mockSupabaseAdapter.exchangeCodeForSession = vi.fn().mockResolvedValue({
        user: null,
        session: null,
      });

      await expect(authService.handleCallback('auth-code')).rejects.toThrow(
        AuthError
      );
      await expect(authService.handleCallback('auth-code')).rejects.toThrow(
        'Failed to get user from OAuth callback'
      );
    });

    it('should throw ValidationError for invalid user ID', async () => {
      mockSupabaseAdapter.exchangeCodeForSession = vi.fn().mockResolvedValue({
        user: { id: 'invalid-uuid', email: 'test@example.com' },
        session: { access_token: 'token' },
      });

      await expect(authService.handleCallback('auth-code')).rejects.toThrow(
        ValidationError
      );
      await expect(authService.handleCallback('auth-code')).rejects.toThrow(
        'Invalid user ID from OAuth provider'
      );
    });
  });

  describe('logout', () => {
    it('should logout user successfully', async () => {
      await authService.logout('session-id');

      expect(mockSupabaseAdapter.signOut).toHaveBeenCalledWith('session-id');
      expect(mockLogger.info).toHaveBeenCalledWith(
        { sessionId: 'session-id' },
        'User logged out successfully'
      );
    });

    it('should throw ValidationError when session ID is missing', async () => {
      await expect(authService.logout('')).rejects.toThrow(ValidationError);
      await expect(authService.logout('')).rejects.toThrow(
        'Session ID is required'
      );
    });

    it('should throw BffError when logout fails', async () => {
      mockSupabaseAdapter.signOut = vi
        .fn()
        .mockRejectedValue(new Error('Logout failed'));

      await expect(authService.logout('session-id')).rejects.toThrow(
        'Failed to logout user'
      );
    });
  });

  describe('getCurrentUser', () => {
    it('should return user for valid session', async () => {
      const result = await authService.getCurrentUser('session-id');

      expect(result).toEqual(mockUser);
      expect(mockSupabaseAdapter.getUserFromSession).toHaveBeenCalledWith(
        'session-id'
      );
      expect(mockSupabaseAdapter.getUser).toHaveBeenCalledWith(mockUser.id);
    });

    it('should return null for empty session ID', async () => {
      const result = await authService.getCurrentUser('');

      expect(result).toBeNull();
      expect(mockSupabaseAdapter.getUserFromSession).not.toHaveBeenCalled();
    });

    it('should return null when session is invalid', async () => {
      mockSupabaseAdapter.getUserFromSession = vi.fn().mockResolvedValue(null);

      const result = await authService.getCurrentUser('invalid-session');

      expect(result).toBeNull();
    });

    it('should return null when user not found in database', async () => {
      mockSupabaseAdapter.getUser = vi.fn().mockResolvedValue(null);

      const result = await authService.getCurrentUser('session-id');

      expect(result).toBeNull();
      expect(mockLogger.warn).toHaveBeenCalledWith(
        { userId: mockUser.id },
        'User exists in auth but not in database'
      );
    });

    it('should return null and log error when getCurrentUser fails', async () => {
      mockSupabaseAdapter.getUserFromSession = vi
        .fn()
        .mockRejectedValue(new Error('Session lookup failed'));

      const result = await authService.getCurrentUser('session-id');

      expect(result).toBeNull();
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({ err: expect.any(Error) }),
        'Failed to get current user'
      );
    });
  });

  describe('refreshSession', () => {
    it('should refresh session successfully', async () => {
      const result = await authService.refreshSession('refresh-token');

      expect(result).toEqual({
        userId: mockUser.id,
        accessToken: 'new-mock-token',
        refreshToken: 'new-mock-refresh',
        expiresAt: expect.any(Date),
      });

      expect(mockSupabaseAdapter.refreshSession).toHaveBeenCalledWith(
        'refresh-token'
      );
    });

    it('should throw ValidationError when refresh token is missing', async () => {
      await expect(authService.refreshSession('')).rejects.toThrow(
        ValidationError
      );
      await expect(authService.refreshSession('')).rejects.toThrow(
        'Refresh token is required'
      );
    });

    it('should throw AuthError when refresh fails', async () => {
      mockSupabaseAdapter.refreshSession = vi.fn().mockResolvedValue({
        session: null,
      });

      await expect(authService.refreshSession('refresh-token')).rejects.toThrow(
        AuthError
      );
      await expect(authService.refreshSession('refresh-token')).rejects.toThrow(
        'Failed to refresh session'
      );
    });
  });

  describe('validateSession', () => {
    it('should validate session and return user', async () => {
      const result = await authService.validateSession('access-token');

      expect(result).toEqual(mockUser);
      expect(mockSupabaseAdapter.getUserFromToken).toHaveBeenCalledWith(
        'access-token'
      );
      expect(mockSupabaseAdapter.getUser).toHaveBeenCalledWith(mockUser.id);
    });

    it('should return null for empty access token', async () => {
      const result = await authService.validateSession('');

      expect(result).toBeNull();
      expect(mockSupabaseAdapter.getUserFromToken).not.toHaveBeenCalled();
    });

    it('should return null when token is invalid', async () => {
      mockSupabaseAdapter.getUserFromToken = vi.fn().mockResolvedValue(null);

      const result = await authService.validateSession('invalid-token');

      expect(result).toBeNull();
    });

    it('should return null and log error when validation fails', async () => {
      mockSupabaseAdapter.getUserFromToken = vi
        .fn()
        .mockRejectedValue(new Error('Token validation failed'));

      const result = await authService.validateSession('access-token');

      expect(result).toBeNull();
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({ err: expect.any(Error) }),
        'Failed to validate session'
      );
    });
  });
});
