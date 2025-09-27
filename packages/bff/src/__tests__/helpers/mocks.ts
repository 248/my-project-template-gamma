/**
 * BFF層テスト用のモックヘルパー
 */

import { vi } from 'vitest';
import { User } from '@template-gamma/core/user';
import { Image } from '@template-gamma/core/image';
import {
  SupabaseAdapter,
  StorageAdapter,
  Logger,
} from '@template-gamma/adapters';

/**
 * モックユーザーデータ
 */
export const mockUser: User = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  createdAt: new Date('2024-01-01T00:00:00Z'),
  updatedAt: new Date('2024-01-01T00:00:00Z'),
  lastLoginAt: new Date('2024-01-01T00:00:00Z'),
};

/**
 * モック画像データ
 */
export const mockImage: Image = {
  id: '987fcdeb-51a2-43d7-8f9e-123456789abc',
  userId: mockUser.id,
  filename: 'test-image.jpg',
  storagePath: `${mockUser.id}/987fcdeb-51a2-43d7-8f9e-123456789abc/test-image.jpg`,
  status: 'ready',
  fileSize: 1024000,
  mimeType: 'image/jpeg',
  createdAt: new Date('2024-01-01T00:00:00Z'),
  updatedAt: new Date('2024-01-01T00:00:00Z'),
};

/**
 * モックSupabaseAdapter
 */
export const createMockSupabaseAdapter = (): SupabaseAdapter => ({
  ping: vi.fn().mockResolvedValue(true),
  getOAuthUrl: vi.fn().mockResolvedValue('https://oauth.example.com/auth'),
  exchangeCodeForSession: vi.fn().mockResolvedValue({
    user: { id: mockUser.id, email: 'test@example.com' },
    session: { access_token: 'mock-token', refresh_token: 'mock-refresh' },
  }),
  getUserFromSession: vi.fn().mockResolvedValue({ id: mockUser.id }),
  getUserFromToken: vi.fn().mockResolvedValue({ id: mockUser.id }),
  refreshSession: vi.fn().mockResolvedValue({
    session: {
      user: { id: mockUser.id },
      access_token: 'new-mock-token',
      refresh_token: 'new-mock-refresh',
      expires_at: Math.floor(Date.now() / 1000) + 3600,
    },
  }),
  signOut: vi.fn().mockResolvedValue(undefined),
  getUser: vi.fn().mockResolvedValue(mockUser),
  createUser: vi.fn().mockResolvedValue(mockUser),
  updateUser: vi.fn().mockResolvedValue(mockUser),
  getImage: vi.fn().mockResolvedValue(mockImage),
  createImage: vi.fn().mockResolvedValue(mockImage),
  updateImage: vi.fn().mockResolvedValue(mockImage),
  deleteImage: vi.fn().mockResolvedValue(undefined),
  getUserImages: vi.fn().mockResolvedValue({
    images: [mockImage],
    total: 1,
  }),
});

/**
 * モックStorageAdapter
 */
export const createMockStorageAdapter = (): StorageAdapter => ({
  ping: vi.fn().mockResolvedValue(true),
  uploadFile: vi
    .fn()
    .mockResolvedValue('https://storage.example.com/upload-url'),
  getSignedUrl: vi
    .fn()
    .mockResolvedValue('https://storage.example.com/signed-url'),
  deleteFile: vi.fn().mockResolvedValue(undefined),
});

/**
 * モックLogger
 */
export const createMockLogger = (): Logger => ({
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
});

/**
 * モック画像ファイル
 */
export const createMockImageFile = (
  overrides?: Partial<{
    filename: string;
    size: number;
    mimeType: string;
    buffer: ArrayBuffer;
  }>
) => ({
  filename: 'test-image.jpg',
  size: 1024000,
  mimeType: 'image/jpeg',
  buffer: new ArrayBuffer(1024000),
  ...overrides,
});

/**
 * エラーを投げるモックSupabaseAdapter
 */
export const createFailingMockSupabaseAdapter = (): SupabaseAdapter => ({
  ...createMockSupabaseAdapter(),
  ping: vi.fn().mockRejectedValue(new Error('Database connection failed')),
});

/**
 * エラーを投げるモックStorageAdapter
 */
export const createFailingMockStorageAdapter = (): StorageAdapter => ({
  ...createMockStorageAdapter(),
  ping: vi.fn().mockRejectedValue(new Error('Storage connection failed')),
});
