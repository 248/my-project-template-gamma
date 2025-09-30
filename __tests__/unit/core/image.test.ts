import { describe, it, expect } from 'vitest';
import { validateFileUpload } from '@template-gamma/core/image';

describe('validateFileUpload', () => {
  it('should accept valid image files', () => {
    const validFile = {
      filename: 'test.jpg',
      size: 1024 * 1024, // 1MB
      mimeType: 'image/jpeg',
    };

    const errors = validateFileUpload(validFile);
    expect(errors).toHaveLength(0);
  });

  it('should reject files that are too large', () => {
    const largeFile = {
      filename: 'large.jpg',
      size: 15 * 1024 * 1024, // 15MB (exceeds 10MB default limit)
      mimeType: 'image/jpeg',
    };

    const errors = validateFileUpload(largeFile);
    expect(errors.length).toBeGreaterThan(0);
    expect(
      errors.some((e) =>
        e.message.includes('ファイルサイズが上限を超えています')
      )
    ).toBe(true);
  });

  it('should reject unsupported file types', () => {
    const invalidFile = {
      filename: 'test.txt',
      size: 1024,
      mimeType: 'text/plain',
    };

    const errors = validateFileUpload(invalidFile);
    expect(errors.length).toBeGreaterThan(0);
    expect(
      errors.some((e) => e.message.includes('許可されていないファイル形式'))
    ).toBe(true);
  });

  it('should accept PNG files', () => {
    const pngFile = {
      filename: 'test.png',
      size: 1024 * 1024,
      mimeType: 'image/png',
    };

    const errors = validateFileUpload(pngFile);
    expect(errors).toHaveLength(0);
  });

  it('should accept WebP files', () => {
    const webpFile = {
      filename: 'test.webp',
      size: 1024 * 1024,
      mimeType: 'image/webp',
    };

    const errors = validateFileUpload(webpFile);
    expect(errors).toHaveLength(0);
  });

  it('should reject files with no extension', () => {
    const noExtFile = {
      filename: 'noextension',
      size: 1024,
      mimeType: 'image/jpeg',
    };

    const errors = validateFileUpload(noExtFile);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.message.includes('ファイル拡張子が必要'))).toBe(
      true
    );
  });
});
