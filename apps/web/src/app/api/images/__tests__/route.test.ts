/**
 * 逕ｻ蜒冗ｮ｡逅・PI 縺ｮ繝・せ繝・
 * 隕∽ｻｶ 4.1-4.4: 逕ｻ蜒冗ｮ｡逅・ｩ溯・縺ｮ繝・せ繝・
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, POST } from '../route';

// 繝｢繝・け險ｭ螳・
vi.mock('@template-gamma/bff/images', () => ({
  ImageServiceFactory: {
    create: vi.fn(() => ({
      listUserImages: vi.fn(),
      uploadImage: vi.fn(),
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

describe('/api/images', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/images', () => {
    it('should return image list successfully', async () => {
      const mockImageService = {
        listUserImages: vi.fn().mockResolvedValue({
          images: [
            {
              id: 'test-image-id',
              filename: 'test.jpg',
              status: 'ready',
              fileSize: 1024,
              mimeType: 'image/jpeg',
              createdAt: new Date('2024-01-01T00:00:00Z'),
              updatedAt: new Date('2024-01-01T00:00:00Z'),
            },
          ],
          pagination: {
            page: 1,
            limit: 20,
            total: 1,
            hasNext: false,
          },
        }),
      };

      const { ImageServiceFactory } = await import(
        '@template-gamma/bff/images'
      );
      vi.mocked(ImageServiceFactory.create).mockReturnValue(
        mockImageService as any
      );

      const request = new NextRequest(
        'http://localhost:3000/api/images?page=1&limit=20'
      );
      request.headers.set('x-authenticated-user-id', 'test-user-id');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.images).toHaveLength(1);
      expect(data.images[0].id).toBe('test-image-id');
      expect(data.pagination.total).toBe(1);
      expect(mockImageService.listUserImages).toHaveBeenCalledWith(
        'test-user-id',
        1,
        20
      );
    });

    it('should return 401 when user is not authenticated', async () => {
      const request = new NextRequest('http://localhost:3000/api/images');
      // x-authenticated-user-id 繝倥ャ繝繝ｼ繧定ｨｭ螳壹＠縺ｪ縺・
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.code).toBe('AUTH_REQUIRED');
    });

    it('should validate query parameters', async () => {
      const mockImageService = {
        listUserImages: vi.fn().mockResolvedValue({
          images: [],
          pagination: { page: 1, limit: 20, total: 0, hasNext: false },
        }),
      };

      const { ImageServiceFactory } = await import(
        '@template-gamma/bff/images'
      );
      vi.mocked(ImageServiceFactory.create).mockReturnValue(
        mockImageService as any
      );

      const request = new NextRequest(
        'http://localhost:3000/api/images?page=2&limit=50'
      );
      request.headers.set('x-authenticated-user-id', 'test-user-id');

      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(mockImageService.listUserImages).toHaveBeenCalledWith(
        'test-user-id',
        2,
        50
      );
    });
  });

  describe('POST /api/images', () => {
    it('should upload image successfully', async () => {
      const mockImageService = {
        uploadImage: vi.fn().mockResolvedValue({
          image: {
            id: 'new-image-id',
            filename: 'upload.jpg',
            status: 'ready',
            fileSize: 2048,
            mimeType: 'image/jpeg',
            createdAt: new Date('2024-01-01T00:00:00Z'),
            updatedAt: new Date('2024-01-01T00:00:00Z'),
          },
        }),
      };

      const { ImageServiceFactory } = await import(
        '@template-gamma/bff/images'
      );
      vi.mocked(ImageServiceFactory.create).mockReturnValue(
        mockImageService as any
      );

      // FormData 繧剃ｽ懶ｿｽE
      const formData = new FormData();
      const file = new File(['test content'], 'upload.jpg', {
        type: 'image/jpeg',
      });
      formData.append('file', file);

      const request = new NextRequest('http://localhost:3000/api/images', {
        method: 'POST',
        body: formData,
      });
      request.headers.set('x-authenticated-user-id', 'test-user-id');

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.id).toBe('new-image-id');
      expect(data.filename).toBe('upload.jpg');
      expect(mockImageService.uploadImage).toHaveBeenCalledWith(
        'test-user-id',
        expect.objectContaining({
          filename: 'upload.jpg',
          mimeType: 'image/jpeg',
        })
      );
    });

    it('should return 401 when user is not authenticated', async () => {
      const formData = new FormData();
      const file = new File(['test content'], 'upload.jpg', {
        type: 'image/jpeg',
      });
      formData.append('file', file);

      const request = new NextRequest('http://localhost:3000/api/images', {
        method: 'POST',
        body: formData,
      });
      // x-authenticated-user-id 繝倥ャ繝繝ｼ繧定ｨｭ螳壹＠縺ｪ縺・
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.code).toBe('AUTH_REQUIRED');
    });

    it('should return 422 when file is missing', async () => {
      const formData = new FormData();
      // 繝輔ぃ繧､繝ｫ繧定ｿｽ蜉縺励↑縺・
      const request = new NextRequest('http://localhost:3000/api/images', {
        method: 'POST',
        body: formData,
      });
      request.headers.set('x-authenticated-user-id', 'test-user-id');

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(422);
      expect(data.code).toBe('VALIDATION_ERROR');
      expect(data.message).toBe('File is required');
    });
  });
});
