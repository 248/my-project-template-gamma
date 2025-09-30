/**
 * APIエラーハンドリングの統合テスト
 * 要件 21.3: Zod 不正入力を 422 で弾くことを検証する
 * 要件 5.5: API エラーが発生した時 THEN システムはコード + メッセージ形式で返却する
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET as imagesGet, POST as imagesPost } from '../images/route';
import { GET as readyzGet } from '../readyz/route';
import { ERROR_CODES } from '@template-gamma/contracts/error-codes';

describe('API Error Handling Integration Tests', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // テスト用環境変数を設定
    process.env = {
      ...originalEnv,
      NODE_ENV: 'test',
      BACKEND_MODE: 'monolith',
      APP_VERSION: '1.0.0-test',
      GIT_COMMIT: 'test-commit',
      BUILD_TIME: '2024-01-01T00:00:00Z',
      LOG_LEVEL: 'error', // テスト中はログを抑制
    };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('Images API Error Handling', () => {
    describe('GET /api/images', () => {
      it('should return 401 for unauthenticated request', async () => {
        const request = new NextRequest('http://localhost/api/images');
        const response = await imagesGet(request);

        expect(response.status).toBe(401);
        const body = await response.json();
        expect(body).toMatchObject({
          code: ERROR_CODES.AUTH_REQUIRED,
          message: expect.any(String),
        });
      });

      it('should return 422 for invalid query parameters', async () => {
        const request = new NextRequest(
          'http://localhost/api/images?page=0&limit=200',
          {
            headers: { 'x-authenticated-user-id': '550e8400-e29b-41d4-a716-446655440000' },
          }
        );
        const response = await imagesGet(request);

        expect(response.status).toBe(422);
        const body = await response.json();
        expect(body).toMatchObject({
          code: ERROR_CODES.VALIDATION_ERROR,
          message: 'Invalid pagination parameters',
        });
      });

      it('should return 200 for valid authenticated request', async () => {
        const request = new NextRequest(
          'http://localhost/api/images?page=1&limit=20',
          {
            headers: { 'x-authenticated-user-id': '550e8400-e29b-41d4-a716-446655440000' },
          }
        );
        const response = await imagesGet(request);

        expect(response.status).toBe(200);
        const body = await response.json();
        expect(body).toHaveProperty('images');
        expect(body).toHaveProperty('pagination');
      });
    });

    describe('POST /api/images', () => {
      it('should return 401 for unauthenticated request', async () => {
        const formData = new FormData();
        const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
        formData.append('file', file);

        const request = new NextRequest('http://localhost/api/images', {
          method: 'POST',
          body: formData,
        });
        const response = await imagesPost(request);

        expect(response.status).toBe(401);
        const body = await response.json();
        expect(body).toMatchObject({
          code: ERROR_CODES.AUTH_REQUIRED,
          message: expect.any(String),
        });
      });

      it('should return 422 for missing file', async () => {
        const formData = new FormData();

        const request = new NextRequest('http://localhost/api/images', {
          method: 'POST',
          body: formData,
          headers: { 'x-authenticated-user-id': '550e8400-e29b-41d4-a716-446655440000' },
        });
        const response = await imagesPost(request);

        expect(response.status).toBe(422);
        const body = await response.json();
        expect(body).toMatchObject({
          code: ERROR_CODES.VALIDATION_ERROR,
          message: 'File is required',
        });
      });

      it('should return 422 for unsupported file type', async () => {
        const formData = new FormData();
        const file = new File(['test'], 'test.txt', { type: 'text/plain' });
        formData.append('file', file);

        const request = new NextRequest('http://localhost/api/images', {
          method: 'POST',
          body: formData,
          headers: { 'x-authenticated-user-id': '550e8400-e29b-41d4-a716-446655440000' },
        });
        const response = await imagesPost(request);

        expect(response.status).toBe(422);
        const body = await response.json();
        expect(body).toMatchObject({
          code: ERROR_CODES.UNSUPPORTED_FILE_TYPE,
          message: 'Unsupported file type',
        });
      });

      it('should return 422 for file too large', async () => {
        const formData = new FormData();
        // 11MB のファイル（制限は10MB）
        const largeContent = 'x'.repeat(11 * 1024 * 1024);
        const file = new File([largeContent], 'large.jpg', {
          type: 'image/jpeg',
        });
        formData.append('file', file);

        const request = new NextRequest('http://localhost/api/images', {
          method: 'POST',
          body: formData,
          headers: { 'x-authenticated-user-id': '550e8400-e29b-41d4-a716-446655440000' },
        });
        const response = await imagesPost(request);

        expect(response.status).toBe(422);
        const body = await response.json();
        expect(body).toMatchObject({
          code: ERROR_CODES.FILE_TOO_LARGE,
          message: 'File size exceeds 10MB limit',
        });
      });

      it('should return 201 for valid file upload', async () => {
        const formData = new FormData();
        const file = new File(['test content'], 'test.jpg', {
          type: 'image/jpeg',
        });
        formData.append('file', file);

        const request = new NextRequest('http://localhost/api/images', {
          method: 'POST',
          body: formData,
          headers: { 'x-authenticated-user-id': '550e8400-e29b-41d4-a716-446655440000' },
        });
        const response = await imagesPost(request);

        expect(response.status).toBe(201);
        const body = await response.json();
        expect(body).toMatchObject({
          id: expect.any(String),
          filename: 'test.jpg',
          status: expect.any(String),
          createdAt: expect.any(String),
          updatedAt: expect.any(String),
        });
      });
    });
  });

  describe('Health Check API Error Handling', () => {
    describe('GET /api/readyz', () => {
      it('should return 200 for successful readiness check', async () => {
        const request = new NextRequest('http://localhost/api/readyz');
        const response = await readyzGet(request);

        expect(response.status).toBe(200);
        const body = await response.json();
        expect(body).toMatchObject({
          status: expect.stringMatching(/^(ok|degraded|down)$/),
          dependencies: expect.arrayContaining([
            expect.objectContaining({
              name: expect.any(String),
              status: expect.stringMatching(/^(ok|degraded|down)$/),
            }),
          ]),
          version: expect.any(String),
          commit: expect.any(String),
          buildTime: expect.any(String),
        });
      });
    });
  });

  describe('Error Response Format Consistency', () => {
    it('should return consistent error format across all endpoints', async () => {
      const testCases = [
        {
          name: 'Images GET - Auth Error',
          request: new NextRequest('http://localhost/api/images'),
          handler: imagesGet,
          expectedStatus: 401,
          expectedCode: ERROR_CODES.AUTH_REQUIRED,
        },
        {
          name: 'Images POST - Auth Error',
          request: new NextRequest('http://localhost/api/images', {
            method: 'POST',
          }),
          handler: imagesPost,
          expectedStatus: 401,
          expectedCode: ERROR_CODES.AUTH_REQUIRED,
        },
      ];

      for (const testCase of testCases) {
        const response = await testCase.handler(testCase.request);

        expect(response.status).toBe(testCase.expectedStatus);

        const body = await response.json();
        expect(body).toMatchObject({
          code: testCase.expectedCode,
          message: expect.any(String),
        });

        // エラーレスポンスの構造が一貫していることを確認
        expect(typeof body.code).toBe('string');
        expect(typeof body.message).toBe('string');
        if (body.details) {
          expect(typeof body.details).toBe('object');
        }
      }
    });
  });
});