import { describe, it, expect, vi, beforeEach } from 'vitest';

// Next.js依存関係をモック
vi.mock('next/server', () => ({}));

import { AuthServiceImpl } from '@template-gamma/bff/auth/auth-service';
import type { SupabaseAdapter } from '@template-gamma/adapters';
import type { Logger } from '@template-gamma/adapters';

// モックの作成
const mockSupabaseAdapter = {
  getOAuthUrl: vi.fn(),
  exchangeCodeForSession: vi.fn(),
  signOut: vi.fn(),
  getUser: vi.fn(),
  createUser: vi.fn(),
  updateUser: vi.fn(),
  getUserFromSession: vi.fn(),
  refreshSession: vi.fn(),
  getUserFromToken: vi.fn(),
} as unknown as SupabaseAdapter;

const mockLogger = {
  info: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  debug: vi.fn(),
} as unknown as Logger;

describe('AuthServiceImpl', () => {
  let authService: AuthServiceImpl;

  beforeEach(() => {
    vi.clearAllMocks();
    authService = new AuthServiceImpl(mockSupabaseAdapter, mockLogger);
  });

  describe('initiateLogin', () => {
    it('should initiate OAuth login with GitHub provider', async () => {
      const mockAuthUrl = 'https://github.com/login/oauth/authorize?...';
      vi.mocked(mockSupabaseAdapter.getOAuthUrl).mockResolvedValue(mockAuthUrl);

      const result = await authService.initiateLogin('github');

      expect(result.redirectUrl).toBe(mockAuthUrl);
      expect(mockSupabaseAdapter.getOAuthUrl).toHaveBeenCalledWith('github', {
        redirectTo: '/home',
      });
    });

    it('should reject unsupported providers', async () => {
      await expect(authService.initiateLogin('unsupported')).rejects.toThrow(
        'Unsupported OAuth provider'
      );
      expect(mockSupabaseAdapter.getOAuthUrl).not.toHaveBeenCalled();
    });
  });

  describe('handleCallback', () => {
    it('should exchange code for session and create user record', async () => {
      const mockAuthUser = {
        id: '550e8400-e29b-41d4-a716-446655440000', // Valid UUID
        email: 'test@example.com',
      };

      const mockUser = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: new Date(),
      };

      vi.mocked(mockSupabaseAdapter.exchangeCodeForSession).mockResolvedValue({
        user: mockAuthUser,
        session: { access_token: 'token' },
      });

      vi.mocked(mockSupabaseAdapter.getUser).mockResolvedValue(null); // New user
      vi.mocked(mockSupabaseAdapter.createUser).mockResolvedValue(mockUser);

      const result = await authService.handleCallback('auth-code-123');

      expect(result.user).toBeDefined();
      expect(result.redirectUrl).toBe('/home');
      expect(mockSupabaseAdapter.exchangeCodeForSession).toHaveBeenCalledWith(
        'auth-code-123'
      );
      expect(mockSupabaseAdapter.createUser).toHaveBeenCalled();
    });

    it('should handle callback errors', async () => {
      vi.mocked(mockSupabaseAdapter.exchangeCodeForSession).mockResolvedValue({
        user: null,
        session: null,
      });

      await expect(
        authService.handleCallback('invalid-code')
      ).rejects.toThrow();
    });

    it('should update last login for existing users', async () => {
      const mockAuthUser = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        email: 'existing@example.com',
      };

      const existingUser = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
        lastLoginAt: new Date('2024-01-01'),
      };

      vi.mocked(mockSupabaseAdapter.exchangeCodeForSession).mockResolvedValue({
        user: mockAuthUser,
        session: { access_token: 'token' },
      });

      vi.mocked(mockSupabaseAdapter.getUser).mockResolvedValue(existingUser);
      vi.mocked(mockSupabaseAdapter.updateUser).mockResolvedValue(existingUser);

      const result = await authService.handleCallback('auth-code-123');

      expect(result.user).toBeDefined();
      expect(mockSupabaseAdapter.updateUser).toHaveBeenCalled();
    });
  });

  describe('logout', () => {
    it('should sign out user successfully', async () => {
      vi.mocked(mockSupabaseAdapter.signOut).mockResolvedValue(undefined);

      await expect(authService.logout('session-123')).resolves.not.toThrow();
      expect(mockSupabaseAdapter.signOut).toHaveBeenCalledWith('session-123');
    });

    it('should handle logout errors gracefully', async () => {
      vi.mocked(mockSupabaseAdapter.signOut).mockRejectedValue(
        new Error('Session not found')
      );

      await expect(authService.logout('invalid-session')).rejects.toThrow();
    });
  });

  describe('getCurrentUser', () => {
    it('should return current user for valid session', async () => {
      const mockAuthUser = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        email: 'test@example.com',
      };

      const mockUser = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: new Date(),
      };

      vi.mocked(mockSupabaseAdapter.getUserFromSession).mockResolvedValue(
        mockAuthUser
      );
      vi.mocked(mockSupabaseAdapter.getUser).mockResolvedValue(mockUser);

      const result = await authService.getCurrentUser('valid-session');

      expect(result).toEqual(mockUser);
    });

    it('should return null for invalid session', async () => {
      vi.mocked(mockSupabaseAdapter.getUserFromSession).mockResolvedValue(null);

      const result = await authService.getCurrentUser('invalid-session');

      expect(result).toBeNull();
    });
  });
});
