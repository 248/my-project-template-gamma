import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';

// Next.js依存関係をモック
vi.mock('next', () => ({
  default: vi.fn(),
}));

vi.mock('http', () => ({
  createServer: vi.fn(),
}));

vi.mock('url', () => ({
  parse: vi.fn(),
}));

// MSWを使用したAPIテスト
import { server } from '../../utils/mocks';

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'warn' });
});

afterAll(() => {
  server.close();
});

describe('API Validation Integration Tests', () => {
  const baseUrl = 'http://localhost:3000'; // MSWでモックされたベースURL

  describe('Zod Validation Error Handling', () => {
    it('should return 422 for invalid image upload data', async () => {
      const formData = new FormData();
      // 無効なファイル（テキストファイル）をアップロード
      formData.append(
        'file',
        new Blob(['invalid content'], { type: 'text/plain' }),
        'invalid.txt'
      );

      const response = await fetch(`${baseUrl}/api/images`, {
        method: 'POST',
        body: formData,
        headers: {
          Cookie: 'sb-access-token=mock-token-for-test',
        },
      });

      expect(response.status).toBe(422);

      const data = await response.json();
      expect(data).toMatchObject({
        code: 'VALIDATION_ERROR',
        message: expect.any(String),
        details: expect.any(Object),
      });
    });

    it('should return 422 for missing required fields', async () => {
      const response = await fetch(`${baseUrl}/api/images`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: 'sb-access-token=mock-token-for-test',
        },
        body: JSON.stringify({}), // 空のボディ
      });

      expect(response.status).toBe(422);

      const data = await response.json();
      expect(data).toMatchObject({
        code: 'VALIDATION_ERROR',
        message: expect.any(String),
      });
    });

    it('should return 422 for invalid query parameters', async () => {
      const response = await fetch(
        `${baseUrl}/api/images?page=invalid&limit=abc`,
        {
          headers: {
            Cookie: 'sb-access-token=mock-token-for-test',
          },
        }
      );

      expect(response.status).toBe(422);

      const data = await response.json();
      expect(data).toMatchObject({
        code: 'VALIDATION_ERROR',
        message: expect.any(String),
        details: expect.objectContaining({
          page: expect.any(Array),
          limit: expect.any(Array),
        }),
      });
    });

    it('should return 422 for file size exceeding limit', async () => {
      // 大きなファイルを作成（5MB以上）
      const largeContent = new Array(5 * 1024 * 1024).fill('a').join('');
      const formData = new FormData();
      formData.append(
        'file',
        new Blob([largeContent], { type: 'image/jpeg' }),
        'large.jpg'
      );

      const response = await fetch(`${baseUrl}/api/images`, {
        method: 'POST',
        body: formData,
        headers: {
          Cookie: 'sb-access-token=mock-token-for-test',
        },
      });

      expect(response.status).toBe(422);

      const data = await response.json();
      expect(data).toMatchObject({
        code: 'FILE_TOO_LARGE',
        message: expect.stringContaining('size'),
      });
    });
  });

  describe('Authentication Error Handling', () => {
    it('should return 401 for missing authentication', async () => {
      const response = await fetch(`${baseUrl}/api/images`);

      expect(response.status).toBe(401);

      const data = await response.json();
      expect(data).toMatchObject({
        code: 'AUTH_REQUIRED',
        message: expect.any(String),
      });
    });

    it('should return 401 for invalid authentication token', async () => {
      const response = await fetch(`${baseUrl}/api/images`, {
        headers: {
          Cookie: 'sb-access-token=invalid-token',
        },
      });

      expect(response.status).toBe(401);

      const data = await response.json();
      expect(data).toMatchObject({
        code: expect.stringMatching(/^(AUTH_REQUIRED|AUTH_INVALID_TOKEN)$/),
        message: expect.any(String),
      });
    });
  });

  describe('Error Response Format Consistency', () => {
    it('should return consistent error format across all endpoints', async () => {
      const endpoints = ['/api/images', '/api/users/me', '/api/diag'];

      for (const endpoint of endpoints) {
        const response = await fetch(`${baseUrl}${endpoint}`);

        if (response.status >= 400) {
          const data = await response.json();

          // 統一エラー封筒形式の確認
          expect(data).toMatchObject({
            code: expect.any(String),
            message: expect.any(String),
          });

          // codeが有効なエラーコードであることを確認
          expect(data.code).toMatch(/^[A-Z_]+$/);
        }
      }
    });

    it('should include request ID in error responses', async () => {
      const response = await fetch(`${baseUrl}/api/images`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });

      expect(response.status).toBe(401); // 認証エラー

      // レスポンスヘッダーにrequestIdが含まれることを確認
      const requestId = response.headers.get('x-request-id');
      expect(requestId).toBeTruthy();
      expect(requestId).toMatch(/^[a-f0-9-]+$/); // UUID形式
    });
  });
});
