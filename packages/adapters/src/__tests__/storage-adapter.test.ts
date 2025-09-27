import { describe, it, expect, beforeEach } from 'vitest';
import { MockStorageAdapter } from '../storage/mock-storage-adapter.js';
import { STORAGE_BUCKETS } from '../storage/types.js';

describe('MockStorageAdapter', () => {
  let adapter: MockStorageAdapter;

  beforeEach(() => {
    adapter = new MockStorageAdapter();
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

  describe('bucket operations', () => {
    it('should create bucket', async () => {
      await adapter.createBucket(STORAGE_BUCKETS.USER_IMAGES);
      const buckets = adapter.getBuckets();
      expect(buckets).toContain(STORAGE_BUCKETS.USER_IMAGES);
    });
  });

  describe('file operations', () => {
    beforeEach(async () => {
      await adapter.createBucket(STORAGE_BUCKETS.USER_IMAGES);
    });

    it('should upload and retrieve file', async () => {
      const fileContent = Buffer.from('test file content');
      const path = 'user123/image1.jpg';

      const uploadedPath = await adapter.uploadFile(
        STORAGE_BUCKETS.USER_IMAGES,
        path,
        fileContent,
        'image/jpeg'
      );

      expect(uploadedPath).toBe(path);

      const file = adapter.getFile(STORAGE_BUCKETS.USER_IMAGES, path);
      expect(file).toBeDefined();
      expect(file!.content).toEqual(fileContent);
      expect(file!.contentType).toBe('image/jpeg');
      expect(file!.size).toBe(fileContent.length);
    });

    it('should generate signed URL for existing file', async () => {
      const fileContent = Buffer.from('test content');
      const path = 'user123/image1.jpg';

      await adapter.uploadFile(STORAGE_BUCKETS.USER_IMAGES, path, fileContent);

      const signedUrl = await adapter.getSignedUrl(
        STORAGE_BUCKETS.USER_IMAGES,
        path,
        3600
      );

      expect(signedUrl).toContain(STORAGE_BUCKETS.USER_IMAGES);
      expect(signedUrl).toContain(path);
      expect(signedUrl).toContain('expires=');
      expect(signedUrl).toContain('signature=');
    });

    it('should throw error for non-existent file when getting signed URL', async () => {
      await expect(
        adapter.getSignedUrl(STORAGE_BUCKETS.USER_IMAGES, 'non-existent.jpg')
      ).rejects.toThrow('File not found');
    });

    it('should delete file', async () => {
      const fileContent = Buffer.from('test content');
      const path = 'user123/image1.jpg';

      await adapter.uploadFile(STORAGE_BUCKETS.USER_IMAGES, path, fileContent);
      expect(adapter.getFile(STORAGE_BUCKETS.USER_IMAGES, path)).toBeDefined();

      await adapter.deleteFile(STORAGE_BUCKETS.USER_IMAGES, path);
      expect(
        adapter.getFile(STORAGE_BUCKETS.USER_IMAGES, path)
      ).toBeUndefined();
    });

    it('should list files in bucket', async () => {
      const files = [
        { path: 'user123/image1.jpg', content: Buffer.from('content1') },
        { path: 'user123/image2.png', content: Buffer.from('content2') },
        { path: 'user456/image3.gif', content: Buffer.from('content3') },
      ];

      for (const file of files) {
        await adapter.uploadFile(
          STORAGE_BUCKETS.USER_IMAGES,
          file.path,
          file.content
        );
      }

      const allFiles = await adapter.listFiles(STORAGE_BUCKETS.USER_IMAGES);
      expect(allFiles).toHaveLength(3);

      // プレフィックスでフィルタ
      const user123Files = await adapter.listFiles(
        STORAGE_BUCKETS.USER_IMAGES,
        'user123/'
      );
      expect(user123Files).toHaveLength(2);
      expect(user123Files.every((f) => f.name.includes('image'))).toBe(true);
    });

    it('should return empty array for non-existent bucket', async () => {
      const files = await adapter.listFiles('non-existent-bucket');
      expect(files).toEqual([]);
    });
  });

  describe('test helpers', () => {
    it('should clear all files', async () => {
      await adapter.createBucket(STORAGE_BUCKETS.USER_IMAGES);
      await adapter.uploadFile(
        STORAGE_BUCKETS.USER_IMAGES,
        'test.jpg',
        Buffer.from('test')
      );

      adapter.clearFiles();

      const files = await adapter.listFiles(STORAGE_BUCKETS.USER_IMAGES);
      expect(files).toEqual([]);
      expect(adapter.getBuckets()).toEqual([]);
    });
  });
});
