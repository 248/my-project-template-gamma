/**
 * 画像個別操作API のテスト
 * 要件 4.4: 画像削除機能のテスト
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, DELETE } from '../route';

// モック設定
vi.mock('@template-gamma/bff/images', () => ({
  ImageServiceFactory: {
    create: vi.fn(() => ({
      getImage: vi.fn(),
      deleteImage: vi.fn(),
    })),
  },
}));

vi.mock('@template-gamma/adapters/supabase', () => ({
  createSupabaseAdapter: vi.fn(() => ({
    ping: vi.fn().mockResolvedValue(true),
  })),
}));

vi.mock('@template-gamma/adapters/storage', () => ({
  createStorageAdapter: vi.fn(() => ({
    ping: vi.fn().mockResolvedValue(true),
  })),
}));

vi.mock('@template-gamma/adapters/logger', () => ({
  createLogger: vi.fn(() => ({
    info: vi.fn(),
    error: vi.fn(),
  })),
}));

describe('/api/images/[imageId]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/images/[imageId]', () => {
    it('should return image successfully', async () => {
      const mockImage = {
        id: 'test-image-id',
        filename: 'test.jpg',
        status: 'ready',
        fileSize: 1024,
        mimeType: 'image/jpeg',
        createdAt: new Date('2024-01-01T00:00:00Z'),
        updatedAt: new Date('2024-01-01T00:00:00Z'),
      };

      const mockImageService = {
        getImage: vi.fn().mockResolvedValue(mockImage),
      };

      const { ImageServiceFactory } = await import(
        '@template-gamma/bff/images'
      );
      vi.mocked(ImageServiceFactory.create).mockReturnValue(
        mockImageService as any
      );

      const request = new NextRequest(
        'http://localhost:3000/api/images/test-image-id'
      );
      request.headers.set('x-user-id', 'test-user-id');

      const response = await GET(request, {
        params: { imageId: 'test-image-id' },
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.id).toBe('test-image-id');
      expect(data.filename).toBe('test.jpg');
      expect(mockImageService.getImage).toHaveBeenCalledWith(
        'test-user-id',
        'test-image-id'
      );
    });

    it('should return 401 when user is not authenticated', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/images/test-image-id'
      );
      // x-user-id ヘッダーを設定しない

      const response = await GET(request, {
        params: { imageId: 'test-image-id' },
      });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.code).toBe('AUTH_REQUIRED');
    });

    it('should return 422 when imageId is invalid', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/images/invalid-id'
      );
      request.headers.set('x-user-id', 'test-user-id');

      const response = await GET(request, {
        params: { imageId: 'invalid-id' },
      });
      const data = await response.json();

      expect(response.status).toBe(422);
      expect(data.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('DELETE /api/images/[imageId]', () => {
    it('should delete image successfully', async () => {
      const mockImageService = {
        deleteImage: vi.fn().mockResolvedValue(undefined),
      };

      const { ImageServiceFactory } = await import(
        '@template-gamma/bff/images'
      );
      vi.mocked(ImageServiceFactory.create).mockReturnValue(
        mockImageService as any
      );

      const request = new NextRequest(
        'http://localhost:3000/api/images/test-image-id',
        {
          method: 'DELETE',
        }
      );
      request.headers.set('x-user-id', 'test-user-id');

      const response = await DELETE(request, {
        params: { imageId: 'test-image-id' },
      });

      expect(response.status).toBe(204);
      expect(mockImageService.deleteImage).toHaveBeenCalledWith(
        'test-user-id',
        'test-image-id'
      );
    });

    it('should return 401 when user is not authenticated', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/images/test-image-id',
        {
          method: 'DELETE',
        }
      );
      // x-user-id ヘッダーを設定しない

      const response = await DELETE(request, {
        params: { imageId: 'test-image-id' },
      });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.code).toBe('AUTH_REQUIRED');
    });

    it('should return 422 when imageId is invalid', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/images/invalid-id',
        {
          method: 'DELETE',
        }
      );
      request.headers.set('x-user-id', 'test-user-id');

      const response = await DELETE(request, {
        params: { imageId: 'invalid-id' },
      });
      const data = await response.json();

      expect(response.status).toBe(422);
      expect(data.code).toBe('VALIDATION_ERROR');
    });
  });
});
