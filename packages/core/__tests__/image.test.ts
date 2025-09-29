/**
 * Core Image 機能のテスト
 * 要件 11.1-11.2: 画像保存の段階的方針のテスト
 */

import { describe, it, expect } from 'vitest';
import {
  createImage,
  updateImage,
  generateStoragePath,
  getFileExtension,
  getExtensionFromMimeType,
  validateFileUpload,
  validateImage,
  isImageDisplayable,
  isImageProcessing,
  isImageFailed,
  formatFileSize,
  calculateUploadProgress,
} from '../image';

describe('Core Image Functions', () => {
  describe('createImage', () => {
    it('should create image with correct properties', () => {
      const input = {
        id: 'test-id',
        userId: 'user-id',
        filename: 'test.jpg',
        fileSize: 1024,
        mimeType: 'image/jpeg',
      };

      const image = createImage(input);

      expect(image.id).toBe('test-id');
      expect(image.userId).toBe('user-id');
      expect(image.filename).toBe('test.jpg');
      expect(image.status).toBe('uploading');
      expect(image.fileSize).toBe(1024);
      expect(image.mimeType).toBe('image/jpeg');
      expect(image.storagePath).toBe('user-id/test-id/test.jpg');
      expect(image.createdAt).toBeInstanceOf(Date);
      expect(image.updatedAt).toBeInstanceOf(Date);
    });

    it('should create image without optional properties', () => {
      const input = {
        id: 'test-id',
        userId: 'user-id',
        filename: 'test.jpg',
      };

      const image = createImage(input);

      expect(image.fileSize).toBeUndefined();
      expect(image.mimeType).toBeUndefined();
    });
  });

  describe('updateImage', () => {
    it('should update image properties', () => {
      const originalImage = createImage({
        id: 'test-id',
        userId: 'user-id',
        filename: 'test.jpg',
      });

      // 少し待ってから更新して時間差を確保
      const updatedImage = updateImage(originalImage, {
        status: 'ready',
        fileSize: 2048,
      });

      expect(updatedImage.status).toBe('ready');
      expect(updatedImage.fileSize).toBe(2048);
      expect(updatedImage.filename).toBe('test.jpg'); // 変更されない
      expect(updatedImage.updatedAt.getTime()).toBeGreaterThanOrEqual(
        originalImage.updatedAt.getTime()
      );
    });
  });

  describe('generateStoragePath', () => {
    it('should generate correct storage path', () => {
      const path = generateStoragePath('user-123', 'image-456', 'photo.jpg');
      expect(path).toBe('user-123/image-456/photo.jpg');
    });
  });

  describe('getFileExtension', () => {
    it('should extract file extension correctly', () => {
      expect(getFileExtension('test.jpg')).toBe('.jpg');
      expect(getFileExtension('image.PNG')).toBe('.png');
      expect(getFileExtension('file.tar.gz')).toBe('.gz');
      expect(getFileExtension('noextension')).toBe('');
      expect(getFileExtension('')).toBe('');
    });
  });

  describe('getExtensionFromMimeType', () => {
    it('should return correct extension for known MIME types', () => {
      expect(getExtensionFromMimeType('image/jpeg')).toBe('.jpg');
      expect(getExtensionFromMimeType('image/png')).toBe('.png');
      expect(getExtensionFromMimeType('image/gif')).toBe('.gif');
      expect(getExtensionFromMimeType('image/webp')).toBe('.webp');
      expect(getExtensionFromMimeType('IMAGE/JPEG')).toBe('.jpg'); // 大文字小文字
    });

    it('should return empty string for unknown MIME types', () => {
      expect(getExtensionFromMimeType('text/plain')).toBe('');
      expect(getExtensionFromMimeType('application/pdf')).toBe('');
    });
  });

  describe('validateFileUpload', () => {
    it('should pass validation for valid file', () => {
      const file = {
        filename: 'test.jpg',
        size: 1024,
        mimeType: 'image/jpeg',
      };

      const errors = validateFileUpload(file);
      expect(errors).toHaveLength(0);
    });

    it('should reject missing filename', () => {
      const file = {
        filename: '',
        size: 1024,
        mimeType: 'image/jpeg',
      };

      const errors = validateFileUpload(file);
      expect(errors).toHaveLength(1);
      expect(errors[0].field).toBe('filename');
    });

    it('should reject file without extension', () => {
      const file = {
        filename: 'noextension',
        size: 1024,
        mimeType: 'image/jpeg',
      };

      const errors = validateFileUpload(file);
      expect(errors).toHaveLength(1);
      expect(errors[0].field).toBe('filename');
    });

    it('should reject unsupported file extension', () => {
      const file = {
        filename: 'test.txt',
        size: 1024,
        mimeType: 'text/plain',
      };

      const errors = validateFileUpload(file);
      expect(errors).toHaveLength(2); // 拡張子とMIMEタイプの両方でエラー
      expect(errors.some((e) => e.field === 'filename')).toBe(true);
      expect(errors.some((e) => e.field === 'mimeType')).toBe(true);
    });

    it('should reject file that is too large', () => {
      const file = {
        filename: 'test.jpg',
        size: 11 * 1024 * 1024, // 11MB
        mimeType: 'image/jpeg',
      };

      const errors = validateFileUpload(file);
      expect(errors).toHaveLength(1);
      expect(errors[0].field).toBe('size');
    });

    it('should reject zero-size file', () => {
      const file = {
        filename: 'test.jpg',
        size: 0,
        mimeType: 'image/jpeg',
      };

      const errors = validateFileUpload(file);
      expect(errors).toHaveLength(1);
      expect(errors[0].field).toBe('size');
    });

    it('should use custom validation options', () => {
      const file = {
        filename: 'test.jpg',
        size: 1024,
        mimeType: 'image/jpeg',
      };

      const customOptions = {
        maxSizeBytes: 512, // 512バイト制限
        allowedMimeTypes: ['image/png'], // PNGのみ許可
        allowedExtensions: ['.png'],
      };

      const errors = validateFileUpload(file, customOptions);
      expect(errors).toHaveLength(3); // サイズ、MIMEタイプ、拡張子でエラー
    });
  });

  describe('validateImage', () => {
    it('should pass validation for valid image', () => {
      const image = createImage({
        id: 'test-id',
        userId: 'user-id',
        filename: 'test.jpg',
      });

      const errors = validateImage(image);
      expect(errors).toHaveLength(0);
    });

    it('should reject image with missing required fields', () => {
      const invalidImage = {
        id: '',
        userId: '',
        filename: '',
        storagePath: '',
        status: 'invalid' as 'uploading',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const errors = validateImage(invalidImage);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.field === 'id')).toBe(true);
      expect(errors.some((e) => e.field === 'userId')).toBe(true);
      expect(errors.some((e) => e.field === 'filename')).toBe(true);
      expect(errors.some((e) => e.field === 'status')).toBe(true);
    });

    it('should reject image with invalid dates', () => {
      const invalidImage = {
        id: 'test-id',
        userId: 'user-id',
        filename: 'test.jpg',
        storagePath: 'path',
        status: 'ready' as const,
        createdAt: new Date('invalid'),
        updatedAt: new Date('invalid'),
      };

      const errors = validateImage(invalidImage);
      expect(errors.some((e) => e.field === 'createdAt')).toBe(true);
      expect(errors.some((e) => e.field === 'updatedAt')).toBe(true);
    });

    it('should reject image with updatedAt before createdAt', () => {
      const invalidImage = {
        id: 'test-id',
        userId: 'user-id',
        filename: 'test.jpg',
        storagePath: 'path',
        status: 'ready' as const,
        createdAt: new Date('2024-01-02'),
        updatedAt: new Date('2024-01-01'), // 作成日より前
      };

      const errors = validateImage(invalidImage);
      expect(errors.some((e) => e.field === 'updatedAt')).toBe(true);
    });
  });

  describe('status check functions', () => {
    it('should correctly identify displayable images', () => {
      const readyImage = createImage({
        id: 'test-id',
        userId: 'user-id',
        filename: 'test.jpg',
      });
      readyImage.status = 'ready';

      const uploadingImage = { ...readyImage, status: 'uploading' as const };

      expect(isImageDisplayable(readyImage)).toBe(true);
      expect(isImageDisplayable(uploadingImage)).toBe(false);
    });

    it('should correctly identify processing images', () => {
      const uploadingImage = createImage({
        id: 'test-id',
        userId: 'user-id',
        filename: 'test.jpg',
      });
      uploadingImage.status = 'uploading';

      const processingImage = {
        ...uploadingImage,
        status: 'processing' as const,
      };
      const readyImage = { ...uploadingImage, status: 'ready' as const };

      expect(isImageProcessing(uploadingImage)).toBe(true);
      expect(isImageProcessing(processingImage)).toBe(true);
      expect(isImageProcessing(readyImage)).toBe(false);
    });

    it('should correctly identify failed images', () => {
      const failedImage = createImage({
        id: 'test-id',
        userId: 'user-id',
        filename: 'test.jpg',
      });
      failedImage.status = 'failed';

      const readyImage = { ...failedImage, status: 'ready' as const };

      expect(isImageFailed(failedImage)).toBe(true);
      expect(isImageFailed(readyImage)).toBe(false);
    });
  });

  describe('formatFileSize', () => {
    it('should format file sizes correctly', () => {
      expect(formatFileSize(0)).toBe('0 B');
      expect(formatFileSize(1024)).toBe('1 KB');
      expect(formatFileSize(1536)).toBe('1.5 KB');
      expect(formatFileSize(1024 * 1024)).toBe('1 MB');
      expect(formatFileSize(1024 * 1024 * 1024)).toBe('1 GB');
    });
  });

  describe('calculateUploadProgress', () => {
    it('should return correct progress for each status', () => {
      const baseImage = createImage({
        id: 'test-id',
        userId: 'user-id',
        filename: 'test.jpg',
      });

      expect(
        calculateUploadProgress({ ...baseImage, status: 'uploading' })
      ).toBe(25);
      expect(
        calculateUploadProgress({ ...baseImage, status: 'processing' })
      ).toBe(75);
      expect(calculateUploadProgress({ ...baseImage, status: 'ready' })).toBe(
        100
      );
      expect(calculateUploadProgress({ ...baseImage, status: 'failed' })).toBe(
        0
      );
    });
  });
});
