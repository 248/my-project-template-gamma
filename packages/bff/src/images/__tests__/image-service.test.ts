/**
 * ImageService のテスト
 * 要件 4.1-4.6: 画像管理機能のテスト
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ImageServiceImpl } from '../image-service';
import { MockSupabaseAdapter } from '@template-gamma/adapters/supabase';
import { MockStorageAdapter } from '@template-gamma/adapters/storage';
import { MockLogger } from '@template-gamma/adapters/logger';
import {
  ValidationError,
  NotFoundError,
  AuthorizationError,
} from '../../error-handler';
import { Image } from '@template-gamma/core/image';

describe('ImageService', () => {
  let imageService: ImageServiceImpl;
  let mockSupabaseAdapter: MockSupabaseAdapter;
  let mockStorageAdapter: MockStorageAdapter;
  let mockLogger: MockLogger;

  beforeEach(() => {
    mockSupabaseAdapter = new MockSupabaseAdapter();
    mockStorageAdapter = new MockStorageAdapter();
    mockLogger = new MockLogger();

    imageService = new ImageServiceImpl(
      mockSupabaseAdapter,
      mockStorageAdapter,
      mockLogger
    );
  });

  describe('uploadImage', () => {
    const validImageFile = {
      filename: 'test.jpg',
      size: 1024,
      mimeType: 'image/jpeg',
      buffer: new ArrayBuffer(1024),
    };

    it('should upload image successfully', async () => {
      const userId = '550e8400-e29b-41d4-a716-446655440000'; // 有効なUUID

      // モックの設定
      vi.spyOn(mockSupabaseAdapter, 'createImage').mockResolvedValue({
        id: 'test-image-id',
        userId,
        filename: 'test.jpg',
        storagePath: `${userId}/test-image-id/test.jpg`,
        status: 'uploading',
        fileSize: 1024,
        mimeType: 'image/jpeg',
        createdAt: new Date(),
        updatedAt: new Date(),
      } as Image);

      vi.spyOn(mockSupabaseAdapter, 'updateImage').mockResolvedValue({
        id: 'test-image-id',
        userId,
        filename: 'test.jpg',
        storagePath: `${userId}/test-image-id/test.jpg`,
        status: 'ready',
        fileSize: 1024,
        mimeType: 'image/jpeg',
        createdAt: new Date(),
        updatedAt: new Date(),
      } as Image);

      vi.spyOn(mockStorageAdapter, 'uploadFile').mockResolvedValue(
        'upload-url'
      );

      const result = await imageService.uploadImage(userId, validImageFile);

      expect(result.image.status).toBe('ready');
      expect(result.image.filename).toBe('test.jpg');
      expect(result.uploadUrl).toBe('upload-url');
      expect(mockSupabaseAdapter.createImage).toHaveBeenCalled();
      expect(mockStorageAdapter.uploadFile).toHaveBeenCalledWith(
        'user-images',
        expect.stringContaining(userId),
        validImageFile.buffer,
        expect.objectContaining({
          contentType: 'image/jpeg',
        })
      );
    });

    it('should reject invalid user ID', async () => {
      await expect(
        imageService.uploadImage('invalid-id', validImageFile)
      ).rejects.toThrow(ValidationError);
    });

    it('should reject file that is too large', async () => {
      const largeFile = {
        ...validImageFile,
        size: 11 * 1024 * 1024, // 11MB
      };

      await expect(
        imageService.uploadImage('test-user-id', largeFile)
      ).rejects.toThrow(ValidationError);
    });

    it('should reject unsupported file type', async () => {
      const unsupportedFile = {
        ...validImageFile,
        filename: 'test.txt',
        mimeType: 'text/plain',
      };

      await expect(
        imageService.uploadImage(
          '550e8400-e29b-41d4-a716-446655440000',
          unsupportedFile
        )
      ).rejects.toThrow(ValidationError);
    });

    it('should handle storage upload failure', async () => {
      const userId = '550e8400-e29b-41d4-a716-446655440000';

      vi.spyOn(mockSupabaseAdapter, 'createImage').mockResolvedValue({
        id: 'test-image-id',
        userId,
        filename: 'test.jpg',
        storagePath: `${userId}/test-image-id/test.jpg`,
        status: 'uploading',
        fileSize: 1024,
        mimeType: 'image/jpeg',
        createdAt: new Date(),
        updatedAt: new Date(),
      } as Image);

      vi.spyOn(mockSupabaseAdapter, 'updateImage').mockResolvedValue({
        id: 'test-image-id',
        userId,
        filename: 'test.jpg',
        storagePath: `${userId}/test-image-id/test.jpg`,
        status: 'failed',
        fileSize: 1024,
        mimeType: 'image/jpeg',
        createdAt: new Date(),
        updatedAt: new Date(),
      } as Image);

      vi.spyOn(mockStorageAdapter, 'uploadFile').mockRejectedValue(
        new Error('Storage error')
      );

      await expect(
        imageService.uploadImage(userId, validImageFile)
      ).rejects.toThrow('Failed to upload image to storage');

      expect(mockSupabaseAdapter.updateImage).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'failed' })
      );
    });
  });

  describe('listUserImages', () => {
    it('should return user images with pagination', async () => {
      const userId = '550e8400-e29b-41d4-a716-446655440000';
      const mockImages: Image[] = [
        {
          id: 'image-1',
          userId,
          filename: 'test1.jpg',
          storagePath: `${userId}/image-1/test1.jpg`,
          status: 'ready',
          fileSize: 1024,
          mimeType: 'image/jpeg',
          createdAt: new Date('2024-01-02'),
          updatedAt: new Date('2024-01-02'),
        },
        {
          id: 'image-2',
          userId,
          filename: 'test2.jpg',
          storagePath: `${userId}/image-2/test2.jpg`,
          status: 'ready',
          fileSize: 2048,
          mimeType: 'image/jpeg',
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01'),
        },
      ];

      vi.spyOn(mockSupabaseAdapter, 'getUserImages').mockResolvedValue({
        images: mockImages,
        total: 2,
      });

      const result = await imageService.listUserImages(userId, 1, 20);

      expect(result.images).toHaveLength(2);
      expect(result.pagination.total).toBe(2);
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(20);
      expect(result.pagination.hasNext).toBe(false);
    });

    it('should reject invalid user ID', async () => {
      await expect(
        imageService.listUserImages('invalid-id', 1, 20)
      ).rejects.toThrow(ValidationError);
    });

    it('should reject invalid pagination parameters', async () => {
      const validUserId = '550e8400-e29b-41d4-a716-446655440000';

      await expect(
        imageService.listUserImages(validUserId, 0, 20)
      ).rejects.toThrow(ValidationError);

      await expect(
        imageService.listUserImages(validUserId, 1, 0)
      ).rejects.toThrow(ValidationError);

      await expect(
        imageService.listUserImages(validUserId, 1, 101)
      ).rejects.toThrow(ValidationError);
    });
  });

  describe('getImage', () => {
    it('should return image for owner', async () => {
      const userId = '550e8400-e29b-41d4-a716-446655440000';
      const imageId = '550e8400-e29b-41d4-a716-446655440001';
      const mockImage: Image = {
        id: imageId,
        userId,
        filename: 'test.jpg',
        storagePath: `${userId}/${imageId}/test.jpg`,
        status: 'ready',
        fileSize: 1024,
        mimeType: 'image/jpeg',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.spyOn(mockSupabaseAdapter, 'getImage').mockResolvedValue(mockImage);

      const result = await imageService.getImage(userId, imageId);

      expect(result).toEqual(mockImage);
      expect(mockSupabaseAdapter.getImage).toHaveBeenCalledWith(imageId);
    });

    it('should reject access by non-owner', async () => {
      const ownerId = '550e8400-e29b-41d4-a716-446655440000';
      const otherUserId = '550e8400-e29b-41d4-a716-446655440001';
      const imageId = '550e8400-e29b-41d4-a716-446655440002';
      const mockImage: Image = {
        id: imageId,
        userId: ownerId,
        filename: 'test.jpg',
        storagePath: `${ownerId}/${imageId}/test.jpg`,
        status: 'ready',
        fileSize: 1024,
        mimeType: 'image/jpeg',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.spyOn(mockSupabaseAdapter, 'getImage').mockResolvedValue(mockImage);

      await expect(imageService.getImage(otherUserId, imageId)).rejects.toThrow(
        AuthorizationError
      );
    });

    it('should throw NotFoundError when image does not exist', async () => {
      vi.spyOn(mockSupabaseAdapter, 'getImage').mockResolvedValue(null);

      await expect(
        imageService.getImage(
          '550e8400-e29b-41d4-a716-446655440000',
          'non-existent-id'
        )
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('deleteImage', () => {
    it('should delete image successfully', async () => {
      const userId = '550e8400-e29b-41d4-a716-446655440000';
      const imageId = '550e8400-e29b-41d4-a716-446655440001';
      const mockImage: Image = {
        id: imageId,
        userId,
        filename: 'test.jpg',
        storagePath: `${userId}/${imageId}/test.jpg`,
        status: 'ready',
        fileSize: 1024,
        mimeType: 'image/jpeg',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.spyOn(mockSupabaseAdapter, 'getImage').mockResolvedValue(mockImage);
      vi.spyOn(mockStorageAdapter, 'deleteFile').mockResolvedValue();
      vi.spyOn(mockSupabaseAdapter, 'deleteImage').mockResolvedValue();

      await imageService.deleteImage(userId, imageId);

      expect(mockStorageAdapter.deleteFile).toHaveBeenCalledWith(
        'user-images',
        mockImage.storagePath
      );
      expect(mockSupabaseAdapter.deleteImage).toHaveBeenCalledWith(imageId);
    });

    it('should continue deletion even if storage deletion fails', async () => {
      const userId = '550e8400-e29b-41d4-a716-446655440000';
      const imageId = '550e8400-e29b-41d4-a716-446655440001';
      const mockImage: Image = {
        id: imageId,
        userId,
        filename: 'test.jpg',
        storagePath: `${userId}/${imageId}/test.jpg`,
        status: 'ready',
        fileSize: 1024,
        mimeType: 'image/jpeg',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.spyOn(mockSupabaseAdapter, 'getImage').mockResolvedValue(mockImage);
      vi.spyOn(mockStorageAdapter, 'deleteFile').mockRejectedValue(
        new Error('Storage error')
      );
      vi.spyOn(mockSupabaseAdapter, 'deleteImage').mockResolvedValue();

      await imageService.deleteImage(userId, imageId);

      expect(mockSupabaseAdapter.deleteImage).toHaveBeenCalledWith(imageId);
    });
  });

  describe('getImageUrl', () => {
    it('should return signed URL for ready image', async () => {
      const userId = '550e8400-e29b-41d4-a716-446655440000';
      const imageId = '550e8400-e29b-41d4-a716-446655440001';
      const mockImage: Image = {
        id: imageId,
        userId,
        filename: 'test.jpg',
        storagePath: `${userId}/${imageId}/test.jpg`,
        status: 'ready',
        fileSize: 1024,
        mimeType: 'image/jpeg',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.spyOn(mockSupabaseAdapter, 'getImage').mockResolvedValue(mockImage);
      vi.spyOn(mockStorageAdapter, 'getSignedUrl').mockResolvedValue(
        'https://example.com/signed-url'
      );

      const result = await imageService.getImageUrl(userId, imageId);

      expect(result).toBe('https://example.com/signed-url');
      expect(mockStorageAdapter.getSignedUrl).toHaveBeenCalledWith(
        'user-images',
        mockImage.storagePath,
        { expiresIn: 3600 }
      );
    });

    it('should reject URL generation for non-ready image', async () => {
      const userId = '550e8400-e29b-41d4-a716-446655440000';
      const imageId = '550e8400-e29b-41d4-a716-446655440001';
      const mockImage: Image = {
        id: imageId,
        userId,
        filename: 'test.jpg',
        storagePath: `${userId}/${imageId}/test.jpg`,
        status: 'uploading',
        fileSize: 1024,
        mimeType: 'image/jpeg',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.spyOn(mockSupabaseAdapter, 'getImage').mockResolvedValue(mockImage);

      await expect(imageService.getImageUrl(userId, imageId)).rejects.toThrow(
        'Image is not ready for display'
      );
    });
  });
});
