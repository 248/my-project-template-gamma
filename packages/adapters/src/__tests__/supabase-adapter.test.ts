import { describe, it, expect, beforeEach } from 'vitest';
import { MockSupabaseAdapter } from '../supabase/mock-supabase-adapter';
import type { User } from '@template-gamma/core/user';

describe('MockSupabaseAdapter', () => {
  let adapter: MockSupabaseAdapter;

  beforeEach(() => {
    adapter = new MockSupabaseAdapter();
  });

  describe('ping', () => {
    it('should return true by default', async () => {
      const result = await adapter.ping();
      expect(result).toBe(true);
    });

    it('should return false when configured to fail', async () => {
      adapter.setFailPing(true);
      const result = await adapter.ping();
      expect(result).toBe(false);
    });
  });

  describe('user management', () => {
    it('should create and retrieve user', async () => {
      const newUser = {
        id: 'new-user-id',
        lastLoginAt: new Date('2024-01-01T00:00:00Z'),
      };

      const createdUser = await adapter.createUser(newUser);

      expect(createdUser.id).toBe(newUser.id);
      expect(createdUser.lastLoginAt).toEqual(newUser.lastLoginAt);
      expect(createdUser.createdAt).toBeDefined();
      expect(createdUser.updatedAt).toBeDefined();

      const retrievedUser = await adapter.getUserById(newUser.id);
      expect(retrievedUser).toEqual(createdUser);
    });

    it('should return null for non-existent user', async () => {
      const user = await adapter.getUserById('non-existent-id');
      expect(user).toBeNull();
    });

    it('should update last login time', async () => {
      const userId = 'test-user-id';
      const originalUser = await adapter.getUserById(userId);
      expect(originalUser).toBeDefined();

      const originalLastLogin = originalUser!.lastLoginAt;

      // 少し待ってから更新
      await new Promise((resolve) => setTimeout(resolve, 10));
      await adapter.updateLastLogin(userId);

      const updatedUser = await adapter.getUserById(userId);
      expect(updatedUser!.lastLoginAt.getTime()).toBeGreaterThan(
        originalLastLogin.getTime()
      );
    });
  });

  describe('authentication', () => {
    it('should return user for valid mock token', async () => {
      const user = await adapter.getUser('mock-access-token');

      expect(user).toEqual({
        id: 'test-user-id',
        email: 'test@example.com',
      });
    });

    it('should return null for invalid token', async () => {
      const user = await adapter.getUser('invalid-token');
      expect(user).toBeNull();
    });

    it('should return default user for unknown token', async () => {
      const user = await adapter.getUser('some-other-token');

      expect(user).toEqual({
        id: 'test-user-id',
        email: 'test@example.com',
      });
    });
  });

  describe('test helpers', () => {
    it('should clear users', async () => {
      adapter.clearUsers();
      const user = await adapter.getUserById('test-user-id');
      expect(user).toBeNull();
    });

    it('should add test user', async () => {
      const testUser: User = {
        id: 'custom-test-user',
        createdAt: new Date('2024-01-01T00:00:00Z'),
        updatedAt: new Date('2024-01-01T00:00:00Z'),
        lastLoginAt: new Date('2024-01-01T00:00:00Z'),
      };

      adapter.addTestUser(testUser);
      const retrievedUser = await adapter.getUserById('custom-test-user');
      expect(retrievedUser).toEqual(testUser);
    });
  });
});
