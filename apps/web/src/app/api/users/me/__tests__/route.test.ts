/**
 * ユーザー惁E��API のチE��チE * Windows環墁E��のモチE��チE�Eタベ�EスでのCRUD操作確誁E */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, PATCH } from '../route';
import { SupabaseFactory } from '@template-gamma/adapters/supabase';

describe('/api/users/me', () => {
  const testUserId = '550e8400-e29b-41d4-a716-446655440000';

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NODE_ENV = 'test';
    process.env.APP_VERSION = '1.0.0';
    process.env.USE_MOCK_SUPABASE = 'true';
    process.env.SUPABASE_URL = 'https://test.supabase.co';
    process.env.SUPABASE_ANON_KEY = 'test-anon-key';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';

    // モチE��インスタンスをリセチE��
    SupabaseFactory.resetMockInstance();
  });

  describe('GET /api/users/me', () => {
    it('認証済みユーザーの情報を取得する', async () => {
      // Arrange
      const request = new NextRequest('http://localhost:3000/api/users/me', {
        method: 'GET',
        headers: {
          'x-authenticated-user-id': testUserId,
        },
      });

      // Act
      const response = await GET(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data).toMatchObject({
        id: testUserId,
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
        lastLoginAt: expect.any(String),
      });

      // 日付形式�E検証
      expect(new Date(data.createdAt)).toBeInstanceOf(Date);
      expect(new Date(data.updatedAt)).toBeInstanceOf(Date);
      expect(new Date(data.lastLoginAt)).toBeInstanceOf(Date);
    });

    it('未認証の場合�E401エラーを返す', async () => {
      // Arrange
      const request = new NextRequest('http://localhost:3000/api/users/me', {
        method: 'GET',
      });

      // Act
      const response = await GET(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(401);
      expect(data).toMatchObject({
        code: 'AUTH_REQUIRED',
        message: 'Authentication required',
      });
    });

    it('無効なユーザーIDの場合�E422エラーを返す', async () => {
      // Arrange
      const request = new NextRequest('http://localhost:3000/api/users/me', {
        method: 'GET',
        headers: {
          'x-authenticated-user-id': 'invalid-uuid',
        },
      });

      // Act
      const response = await GET(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(422);
      expect(data.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('PATCH /api/users/me', () => {
    it('最終ログイン時刻を更新する', async () => {
      // Arrange - まずユーザーを作�E
      const getRequest = new NextRequest('http://localhost:3000/api/users/me', {
        method: 'GET',
        headers: {
          'x-authenticated-user-id': testUserId,
        },
      });
      const getUserResponse = await GET(getRequest);
      expect(getUserResponse.status).toBe(200);

      // 少し征E��してから更新�E�時刻の差を確保！E      await new Promise((resolve) => setTimeout(resolve, 10));

      const patchRequest = new NextRequest(
        'http://localhost:3000/api/users/me',
        {
          method: 'PATCH',
          headers: {
            'x-authenticated-user-id': testUserId,
          },
        }
      );

      // Act
      const response = await PATCH(patchRequest);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data).toMatchObject({
        id: testUserId,
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
        lastLoginAt: expect.any(String),
      });

      // 更新日時が作�E日時以降であることを確誁E      const createdAt = new Date(data.createdAt);
      const updatedAt = new Date(data.updatedAt);
      const lastLoginAt = new Date(data.lastLoginAt);

      expect(updatedAt.getTime()).toBeGreaterThanOrEqual(createdAt.getTime());
      expect(lastLoginAt.getTime()).toBeGreaterThanOrEqual(createdAt.getTime());
    });

    it('未認証の場合�E401エラーを返す', async () => {
      // Arrange
      const request = new NextRequest('http://localhost:3000/api/users/me', {
        method: 'PATCH',
      });

      // Act
      const response = await PATCH(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(401);
      expect(data).toMatchObject({
        code: 'AUTH_REQUIRED',
        message: 'Authentication required',
      });
    });

    it('無効なユーザーIDの場合�E422エラーを返す', async () => {
      // Arrange
      const request = new NextRequest('http://localhost:3000/api/users/me', {
        method: 'PATCH',
        headers: {
          'x-authenticated-user-id': 'invalid-uuid',
        },
      });

      // Act
      const response = await PATCH(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(422);
      expect(data.code).toBe('VALIDATION_ERROR');
    });
  });
});
