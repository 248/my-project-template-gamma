/**
 * 画像サービスのテスト
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ImageServiceImpl } from '../../images/image-service.js';
import {
  ValidationError,
  AuthorizationError,
  NotFoundError,
  BffError,
} from '../../error-handler.js';
import {
  createMockSupabaseAdapter,
  createMockStorageAdapter,
  createMockLogger,
  createMockImageFile,
  mockUser,
  mockImage,
} from '../helpers/mocks.js';

describe('ImageServiceImpl', () => {
  let imageService: ImageServiceImpl;
  let mockSupabaseAdapter: ReturnType<typeof createMockSupabaseAdapter>;
  let mockStorageAdapter: ReturnType<typeof createMockStorageAdapter>;
  let mockLogger: ReturnType<typeof createMockLogger>;

  beforeEach(() => {
    mockSupabaseAdapter = createMockSupabaseAdapter();
    mockStorageAdapter = createMockStorageAdapter();
    mockLogger = createMockLogger();

    imageService = new ImageServiceImpl(
      mockSupabaseAdapter,
      mockStorageAdapter,
      mockLogger
    );

    // crypto.randomUUID のモック
    vi.stubGlobal('crypto', {
      randomUUID: vi
        .fn()
        .mockReturnValue('987fcdeb-51a2-43d7-8f9e-123456789abc'),
    });
  });

  describe('uploadImage', () => {
    it('should upload image successfully', async () => {
      const mockFile = createMockImageFile();

      const result = await imageService.uploadImage(mockUser.id, mockFile);

      expect(result).toEqual({
        image: expect.objectContaining({
          id: '987fcdeb-51a2-43d7-8f9e-123456789abc',
          userId: mockUser.id,
          filename: 'test-image.jpg',
          status: 'ready',
        }),
        uploadUrl: 'https://storage.example.com/upload-url',
      });

      expect(mockSupabaseAdapter.createImage).toHaveBeenCalled();
      expect(mockStorageAdapter.uploadFile).toHaveBeenCalledWith(
        'user-images',
        expect.stringContaining(mockUser.id),
        mockFile.buffer,
        expect.objectContaining({
          contentType: 'image/jpeg',
          metadata: expect.objectContaining({
            userId: mockUser.id,
            imageId: '987fcdeb-51a2-43d7-8f9e-123456789abc',
          }),
        })
      );
      expect(mockSupabaseAdapter.updateImage).toHaveBeenCalled();
    });

    it('should throw ValidationError for invalid user ID', async () => {
      const mockFile = createMockImageFile();

      await expect(
        imageService.uploadImage('invalid-uuid', mockFile)
      ).rejects.toThrow(ValidationError);
      await expect(
        imageService.uploadImage('invalid-uuid', mockFile)
      ).rejects.toThrow('Invalid user ID');
    });

    it('should throw ValidationError for invalid file', async () => {
      const invalidFile = createMockImageFile({
        filename: '', // 無効なファイル名
      });

      await expect(
        imageService.uploadImage(mockUser.id, invalidFile)
      ).rejects.toThrow(ValidationError);
      await expect(
        imageService.uploadImage(mockUser.id, invalidFile)
      ).rejects.toThrow('File validation failed');
    });

    it('should throw ValidationError for unsupported file type', async () => {
      const invalidFile = createMockImageFile({
        mimeType: 'application/pdf',
      });

      await expect(
        imageService.uploadImage(mockUser.id, invalidFile)
      ).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError for file too large', async () => {
      const largeFile = createMockImageFile({
        size: 20 * 1024 * 1024, // 20MB (デフォルト上限10MBを超過)
      });

      await expect(
        imageService.uploadImage(mockUser.id, largeFile)
      ).rejects.toThrow(ValidationError);
    });

    it('should update image status to failed when storage upload fails', async () => {
      mockStorageAdapter.uploadFile = vi
        .fn()
        .mockRejectedValue(new Error('Storage upload failed'));

      const mockFile = createMockImageFile();

      await expect(
        imageService.uploadImage(mockUser.id, mockFile)
      ).rejects.toThrow(BffError);
      await expect(
        imageService.uploadImage(mockUser.id, mockFile)
      ).rejects.toThrow('Failed to upload image to storage');

      // 失敗ステータスで更新されることを確認
      expect(mockSupabaseAdapter.updateImage).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'failed' })
      );
    });
  });

  describe('listUserImages', () => {
    it('should list user images with pagination', async () => {
      const result = await imageService.listUserImages(mockUser.id, 1, 20);

      expect(result).toEqual({
        images: [mockImage],
        pagination: {
          page: 1,
          limit: 20,
          total: 1,
          hasNext: false,
        },
      });

      expect(mockSupabaseAdapter.getUserImages).toHaveBeenCalledWith(
        mockUser.id,
        20,
        0
      );
    });

    it('should use default pagination parameters', async () => {
      await imageService.listUserImages(mockUser.id);

      expect(mockSupabaseAdapter.getUserImages).toHaveBeenCalledWith(
        mockUser.id,
        20,
        0
      );
    });

    it('should throw ValidationError for invalid user ID', async () => {
      await expect(imageService.listUserImages('invalid-uuid')).rejects.toThrow(
        ValidationError
      );
    });

    it('should throw ValidationError for invalid page number', async () => {
      await expect(imageService.listUserImages(mockUser.id, 0)).rejects.toThrow(
        ValidationError
      );
      await expect(imageService.listUserImages(mockUser.id, 0)).rejects.toThrow(
        'Page must be greater than 0'
      );
    });

    it('should throw ValidationError for invalid limit', async () => {
      await expect(
        imageService.listUserImages(mockUser.id, 1, 0)
      ).rejects.toThrow(ValidationError);
      await expect(
        imageService.listUserImages(mockUser.id, 1, 101)
      ).rejects.toThrow(ValidationError);
    });

    it('should calculate hasNext correctly', async () => {
      mockSupabaseAdapter.getUserImages = vi.fn().mockResolvedValue({
        images: [mockImage],
        total: 25,
      });

      const result = await imageService.listUserImages(mockUser.id, 1, 20);

      expect(result.pagination.hasNext).toBe(true);
    });
  });

  describe('getImage', () => {
    it('should get image for owner', async () => {
      const result = await imageService.getImage(mockUser.id, mockImage.id);

      expect(result).toEqual(mockImage);
      expect(mockSupabaseAdapter.getImage).toHaveBeenCalledWith(mockImage.id);
    });

    it('should throw ValidationError for invalid user ID', async () => {
      await expect(
        imageService.getImage('invalid-uuid', mockImage.id)
      ).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError for missing image ID', async () => {
      await expect(imageService.getImage(mockUser.id, '')).rejects.toThrow(
        ValidationError
      );
      await expect(imageService.getImage(mockUser.id, '')).rejects.toThrow(
        'Image ID is required'
      );
    });

    it('should throw NotFoundError when image does not exist', async () => {
      mockSupabaseAdapter.getImage = vi.fn().mockResolvedValue(null);

      await expect(
        imageService.getImage(mockUser.id, 'non-existent-id')
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw AuthorizationError when user does not own image', async () => {
      const otherUserImage = { ...mockImage, userId: 'other-user-id' };
      mockSupabaseAdapter.getImage = vi.fn().mockResolvedValue(otherUserImage);

      await expect(
        imageService.getImage(mockUser.id, mockImage.id)
      ).rejects.toThrow(AuthorizationError);
      await expect(
        imageService.getImage(mockUser.id, mockImage.id)
      ).rejects.toThrow('You do not have permission to access this image');

      expect(mockLogger.warn).toHaveBeenCalledWith(
        {
          userId: mockUser.id,
          imageId: mockImage.id,
          ownerId: 'other-user-id',
        },
        'User attempted to access image they do not own'
      );
    });
  });

  describe('deleteImage', () => {
    it('should delete image successfully', async () => {
      await imageService.deleteImage(mockUser.id, mockImage.id);

      expect(mockStorageAdapter.deleteFile).toHaveBeenCalledWith(
        'user-images',
        mockImage.storagePath
      );
      expect(mockSupabaseAdapter.deleteImage).toHaveBeenCalledWith(
        mockImage.id
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        { userId: mockUser.id, imageId: mockImage.id },
        'Image deleted successfully'
      );
    });

    it('should continue with database deletion even if storage deletion fails', async () => {
      mockStorageAdapter.deleteFile = vi
        .fn()
        .mockRejectedValue(new Error('Storage deletion failed'));

      await imageService.deleteImage(mockUser.id, mockImage.id);

      expect(mockSupabaseAdapter.deleteImage).toHaveBeenCalledWith(
        mockImage.id
      );
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.objectContaining({
          err: expect.any(Error),
          storagePath: mockImage.storagePath,
        }),
        'Failed to delete image from storage, continuing with database deletion'
      );
    });

    it('should throw error when user does not own image', async () => {
      const otherUserImage = { ...mockImage, userId: 'other-user-id' };
      mockSupabaseAdapter.getImage = vi.fn().mockResolvedValue(otherUserImage);

      await expect(
        imageService.deleteImage(mockUser.id, mockImage.id)
      ).rejects.toThrow(AuthorizationError);
    });
  });

  describe('getImageUrl', () => {
    it('should get signed URL for ready image', async () => {
      const result = await imageService.getImageUrl(mockUser.id, mockImage.id);

      expect(result).toBe('https://storage.example.com/signed-url');
      expect(mockStorageAdapter.getSignedUrl).toHaveBeenCalledWith(
        'user-images',
        mockImage.storagePath,
        { expiresIn: 3600 }
      );
    });

    it('should throw BffError for non-ready image', async () => {
      const processingImage = { ...mockImage, status: 'processing' as const };
      mockSupabaseAdapter.getImage = vi.fn().mockResolvedValue(processingImage);

      await expect(
        imageService.getImageUrl(mockUser.id, mockImage.id)
      ).rejects.toThrow(BffError);
      await expect(
        imageService.getImageUrl(mockUser.id, mockImage.id)
      ).rejects.toThrow(
        'Image is not ready for display. Current status: processing'
      );
    });

    it('should throw error when user does not own image', async () => {
      const otherUserImage = { ...mockImage, userId: 'other-user-id' };
      mockSupabaseAdapter.getImage = vi.fn().mockResolvedValue(otherUserImage);

      await expect(
        imageService.getImageUrl(mockUser.id, mockImage.id)
      ).rejects.toThrow(AuthorizationError);
    });
  });

  describe('error handling', () => {
    it('should handle unexpected errors in uploadImage', async () => {
      mockSupabaseAdapter.createImage = vi
        .fn()
        .mockRejectedValue(new Error('Unexpected database error'));

      const mockFile = createMockImageFile();

      await expect(
        imageService.uploadImage(mockUser.id, mockFile)
      ).rejects.toThrow(BffError);
      await expect(
        imageService.uploadImage(mockUser.id, mockFile)
      ).rejects.toThrow('Failed to upload image');
    });

    it('should handle unexpected errors in listUserImages', async () => {
      mockSupabaseAdapter.getUserImages = vi
        .fn()
        .mockRejectedValue(new Error('Unexpected database error'));

      await expect(imageService.listUserImages(mockUser.id)).rejects.toThrow(
        BffError
      );
      await expect(imageService.listUserImages(mockUser.id)).rejects.toThrow(
        'Failed to retrieve user images'
      );
    });
  });
});
