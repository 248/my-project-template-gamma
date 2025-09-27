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
  type Image,
} from '../image';

describe('image', () => {
  const mockUserId = '12345678-1234-1234-1234-123456789012';
  const mockImageId = '87654321-4321-4321-4321-210987654321';

  describe('createImage', () => {
    it('新しい画像レコードを正しく作成する', () => {
      const input = {
        id: mockImageId,
        userId: mockUserId,
        filename: 'test.jpg',
        fileSize: 1024,
        mimeType: 'image/jpeg',
      };

      const image = createImage(input);

      expect(image.id).toBe(mockImageId);
      expect(image.userId).toBe(mockUserId);
      expect(image.filename).toBe('test.jpg');
      expect(image.status).toBe('uploading');
      expect(image.fileSize).toBe(1024);
      expect(image.mimeType).toBe('image/jpeg');
      expect(image.storagePath).toBe(`${mockUserId}/${mockImageId}/test.jpg`);
      expect(image.createdAt).toBeInstanceOf(Date);
      expect(image.updatedAt).toBeInstanceOf(Date);
    });
  });

  describe('updateImage', () => {
    it('画像レコードを更新する', () => {
      const originalImage: Image = {
        id: mockImageId,
        userId: mockUserId,
        filename: 'test.jpg',
        storagePath: `${mockUserId}/${mockImageId}/test.jpg`,
        status: 'uploading',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      };

      const updatedImage = updateImage(originalImage, {
        status: 'ready',
        fileSize: 2048,
      });

      expect(updatedImage.status).toBe('ready');
      expect(updatedImage.fileSize).toBe(2048);
      expect(updatedImage.updatedAt.getTime()).toBeGreaterThan(
        originalImage.updatedAt.getTime()
      );
    });
  });

  describe('generateStoragePath', () => {
    it('正しいストレージパスを生成する', () => {
      const path = generateStoragePath(mockUserId, mockImageId, 'test.jpg');
      expect(path).toBe(`${mockUserId}/${mockImageId}/test.jpg`);
    });
  });

  describe('getFileExtension', () => {
    it('ファイル名から拡張子を取得する', () => {
      expect(getFileExtension('test.jpg')).toBe('.jpg');
      expect(getFileExtension('image.PNG')).toBe('.png');
      expect(getFileExtension('file.with.dots.gif')).toBe('.gif');
    });

    it('拡張子がない場合は空文字を返す', () => {
      expect(getFileExtension('filename')).toBe('');
    });
  });

  describe('getExtensionFromMimeType', () => {
    it('MIMEタイプから拡張子を推定する', () => {
      expect(getExtensionFromMimeType('image/jpeg')).toBe('.jpg');
      expect(getExtensionFromMimeType('image/png')).toBe('.png');
      expect(getExtensionFromMimeType('image/gif')).toBe('.gif');
      expect(getExtensionFromMimeType('image/webp')).toBe('.webp');
    });

    it('未知のMIMEタイプの場合は空文字を返す', () => {
      expect(getExtensionFromMimeType('application/pdf')).toBe('');
    });
  });

  describe('validateFileUpload', () => {
    it('有効なファイルの場合は空の配列を返す', () => {
      const file = {
        filename: 'test.jpg',
        size: 1024,
        mimeType: 'image/jpeg',
      };

      const errors = validateFileUpload(file);
      expect(errors).toEqual([]);
    });

    it('ファイル名が空の場合はエラーを返す', () => {
      const file = {
        filename: '',
        size: 1024,
        mimeType: 'image/jpeg',
      };

      const errors = validateFileUpload(file);
      expect(errors).toHaveLength(1);
      expect(errors[0].field).toBe('filename');
    });

    it('許可されていない拡張子の場合はエラーを返す', () => {
      const file = {
        filename: 'test.pdf',
        size: 1024,
        mimeType: 'application/pdf',
      };

      const errors = validateFileUpload(file);
      expect(
        errors.some(
          (e) =>
            e.field === 'filename' && e.message.includes('許可されていない')
        )
      ).toBe(true);
    });

    it('ファイルサイズが上限を超える場合はエラーを返す', () => {
      const file = {
        filename: 'test.jpg',
        size: 20 * 1024 * 1024, // 20MB
        mimeType: 'image/jpeg',
      };

      const errors = validateFileUpload(file);
      expect(
        errors.some((e) => e.field === 'size' && e.message.includes('上限'))
      ).toBe(true);
    });

    it('許可されていないMIMEタイプの場合はエラーを返す', () => {
      const file = {
        filename: 'test.jpg',
        size: 1024,
        mimeType: 'application/pdf',
      };

      const errors = validateFileUpload(file);
      expect(
        errors.some(
          (e) =>
            e.field === 'mimeType' && e.message.includes('許可されていない')
        )
      ).toBe(true);
    });
  });

  describe('validateImage', () => {
    it('有効な画像レコードの場合は空の配列を返す', () => {
      const image: Image = {
        id: mockImageId,
        userId: mockUserId,
        filename: 'test.jpg',
        storagePath: `${mockUserId}/${mockImageId}/test.jpg`,
        status: 'ready',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-02'),
      };

      const errors = validateImage(image);
      expect(errors).toEqual([]);
    });

    it('無効なステータスの場合はエラーを返す', () => {
      const image = {
        id: mockImageId,
        userId: mockUserId,
        filename: 'test.jpg',
        storagePath: `${mockUserId}/${mockImageId}/test.jpg`,
        status: 'invalid',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-02'),
      } as Image;

      const errors = validateImage(image);
      expect(errors.some((e) => e.field === 'status')).toBe(true);
    });
  });

  describe('isImageDisplayable', () => {
    it('readyステータスの画像は表示可能', () => {
      const image: Image = {
        id: mockImageId,
        userId: mockUserId,
        filename: 'test.jpg',
        storagePath: 'path',
        status: 'ready',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(isImageDisplayable(image)).toBe(true);
    });

    it('ready以外のステータスの画像は表示不可', () => {
      const statuses: Array<Image['status']> = [
        'uploading',
        'processing',
        'failed',
      ];

      statuses.forEach((status) => {
        const image: Image = {
          id: mockImageId,
          userId: mockUserId,
          filename: 'test.jpg',
          storagePath: 'path',
          status,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        expect(isImageDisplayable(image)).toBe(false);
      });
    });
  });

  describe('isImageProcessing', () => {
    it('uploadingまたはprocessingステータスの画像は処理中', () => {
      const processingStatuses: Array<Image['status']> = [
        'uploading',
        'processing',
      ];

      processingStatuses.forEach((status) => {
        const image: Image = {
          id: mockImageId,
          userId: mockUserId,
          filename: 'test.jpg',
          storagePath: 'path',
          status,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        expect(isImageProcessing(image)).toBe(true);
      });
    });

    it('readyまたはfailedステータスの画像は処理中ではない', () => {
      const nonProcessingStatuses: Array<Image['status']> = ['ready', 'failed'];

      nonProcessingStatuses.forEach((status) => {
        const image: Image = {
          id: mockImageId,
          userId: mockUserId,
          filename: 'test.jpg',
          storagePath: 'path',
          status,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        expect(isImageProcessing(image)).toBe(false);
      });
    });
  });

  describe('isImageFailed', () => {
    it('failedステータスの画像は失敗状態', () => {
      const image: Image = {
        id: mockImageId,
        userId: mockUserId,
        filename: 'test.jpg',
        storagePath: 'path',
        status: 'failed',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(isImageFailed(image)).toBe(true);
    });

    it('failed以外のステータスの画像は失敗状態ではない', () => {
      const nonFailedStatuses: Array<Image['status']> = [
        'uploading',
        'processing',
        'ready',
      ];

      nonFailedStatuses.forEach((status) => {
        const image: Image = {
          id: mockImageId,
          userId: mockUserId,
          filename: 'test.jpg',
          storagePath: 'path',
          status,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        expect(isImageFailed(image)).toBe(false);
      });
    });
  });

  describe('formatFileSize', () => {
    it('ファイルサイズを人間が読みやすい形式に変換する', () => {
      expect(formatFileSize(0)).toBe('0 B');
      expect(formatFileSize(1024)).toBe('1 KB');
      expect(formatFileSize(1024 * 1024)).toBe('1 MB');
      expect(formatFileSize(1536)).toBe('1.5 KB');
    });
  });

  describe('calculateUploadProgress', () => {
    it('ステータスに応じた進行状況を返す', () => {
      const testCases: Array<[Image['status'], number]> = [
        ['uploading', 25],
        ['processing', 75],
        ['ready', 100],
        ['failed', 0],
      ];

      testCases.forEach(([status, expectedProgress]) => {
        const image: Image = {
          id: mockImageId,
          userId: mockUserId,
          filename: 'test.jpg',
          storagePath: 'path',
          status,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        expect(calculateUploadProgress(image)).toBe(expectedProgress);
      });
    });
  });
});
