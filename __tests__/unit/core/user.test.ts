import { describe, it, expect, beforeEach } from 'vitest';
import { updateLastLogin } from '@template-gamma/core/user';
import type { User } from '@template-gamma/core/user';

describe('updateLastLogin', () => {
  let mockUser: User;

  beforeEach(() => {
    mockUser = {
      id: 'test-user-id',
      createdAt: new Date('2024-01-01T00:00:00Z'),
      updatedAt: new Date('2024-01-01T00:00:00Z'),
      lastLoginAt: new Date('2024-01-01T00:00:00Z'),
    };
  });

  it('should update lastLoginAt and updatedAt to current time', () => {
    const before = Date.now();
    const updatedUser = updateLastLogin(mockUser);
    const after = Date.now();

    expect(updatedUser.id).toBe(mockUser.id);
    expect(updatedUser.createdAt).toEqual(mockUser.createdAt);
    expect(updatedUser.lastLoginAt.getTime()).toBeGreaterThanOrEqual(before);
    expect(updatedUser.lastLoginAt.getTime()).toBeLessThanOrEqual(after);
    expect(updatedUser.updatedAt.getTime()).toBeGreaterThanOrEqual(before);
    expect(updatedUser.updatedAt.getTime()).toBeLessThanOrEqual(after);
  });

  it('should not mutate the original user object', () => {
    const originalLastLogin = mockUser.lastLoginAt;
    const originalUpdatedAt = mockUser.updatedAt;

    updateLastLogin(mockUser);

    expect(mockUser.lastLoginAt).toEqual(originalLastLogin);
    expect(mockUser.updatedAt).toEqual(originalUpdatedAt);
  });

  it('should return a new user object', () => {
    const updatedUser = updateLastLogin(mockUser);
    expect(updatedUser).not.toBe(mockUser);
  });
});
