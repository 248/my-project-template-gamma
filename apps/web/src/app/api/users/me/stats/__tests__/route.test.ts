/**
 * ユーザー統計情報API のテスト
 * Windows環境でのモックデータベースでのCRUD操作確認
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '../route';
import { GET as getUserGET } from '../../route';
import { SupabaseFactory } from '@template-gamma/adapters/supabase';

describe('/api/users/me/stats', () => {
  const testUserId = '550e8400-e29b-41d4-a716-446655440000';

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NODE_ENV = 'test';
    process.env.APP_VERSION = '1.0.0';
    process.env.USE_MOCK_SUPABASE = 'true';
    process.env.SUPABASE_URL = 'https://test.supabase.co';
    process.env.SUPABASE_ANON_KEY = 'test-anon-key';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';

    // モックインスタンスをリセット
    SupabaseFactory.resetMockInstance();
  });

  describe('GET /api/users/me/stats', () => {
    it.skip('ユーザー統計情報を取得する', async () => {
      // Arrange - まずユーザーを作成
      const createUserRequest = new NextRequest(
        'http://localhost:3000/api/users/me',
        {
          method: 'GET',
          headers: {
            'x-user-id': testUserId,
          },
        }
      );
      const createResponse = await getUserGET(createUserRequest);
      expect(createResponse.status).toBe(200);

      const request = new NextRequest(
        'http://localhost:3000/api/users/me/stats',
        {
          method: 'GET',
          headers: {
            'x-user-id': testUserId,
          },
        }
      );

      // Act
      const response = await GET(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data).toMatchObject({
        ageDays: expect.any(Number),
        daysSinceLastLogin: expect.any(Number),
        isActive: expect.any(Boolean),
      });

      // 作成直後なので経過日数は0
      expect(data.ageDays).toBe(0);
      expect(data.daysSinceLastLogin).toBe(0);
      expect(data.isActive).toBe(true);
    });

    it('カスタム非アクティブ日数を指定して統計情報を取得する', async () => {
      // Arrange - まずユーザーを作成
      const createUserRequest = new NextRequest(
        'http://localhost:3000/api/users/me',
        {
          method: 'GET',
          headers: {
            'x-user-id': testUserId,
          },
        }
      );
      await getUserGET(createUserRequest);

      const request = new NextRequest(
        'http://localhost:3000/api/users/me/stats?inactiveDays=7',
        {
          method: 'GET',
          headers: {
            'x-user-id': testUserId,
          },
        }
      );

      // Act
      const response = await GET(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data).toMatchObject({
        ageDays: expect.any(Number),
        daysSinceLastLogin: expect.any(Number),
        isActive: expect.any(Boolean),
      });

      // 作成直後なのでアクティブ
      expect(data.isActive).toBe(true);
    });

    it('未認証の場合は401エラーを返す', async () => {
      // Arrange
      const request = new NextRequest(
        'http://localhost:3000/api/users/me/stats',
        {
          method: 'GET',
        }
      );

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

    it('無効なユーザーIDの場合は422エラーを返す', async () => {
      // Arrange
      const request = new NextRequest(
        'http://localhost:3000/api/users/me/stats',
        {
          method: 'GET',
          headers: {
            'x-user-id': 'invalid-uuid',
          },
        }
      );

      // Act
      const response = await GET(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(422);
      expect(data.code).toBe('VALIDATION_ERROR');
    });

    it.skip('無効なクエリパラメータの場合は422エラーを返す', async () => {
      // Arrange - まずユーザーを作成
      const createUserRequest = new NextRequest(
        'http://localhost:3000/api/users/me',
        {
          method: 'GET',
          headers: {
            'x-user-id': testUserId,
          },
        }
      );
      await getUserGET(createUserRequest);

      const invalidQueries = [
        'inactiveDays=0', // 最小値未満
        'inactiveDays=400', // 最大値超過
        'inactiveDays=abc', // 数値以外
        'inactiveDays=-5', // 負の値
      ];

      for (const query of invalidQueries) {
        const request = new NextRequest(
          `http://localhost:3000/api/users/me/stats?${query}`,
          {
            method: 'GET',
            headers: {
              'x-user-id': testUserId,
            },
          }
        );

        // Act
        const response = await GET(request);
        const data = await response.json();

        // Assert
        expect(response.status).toBe(422);
        expect(data.code).toBe('VALIDATION_ERROR');
      }
    });

    it.skip('存在しないユーザーの場合は404エラーを返す', async () => {
      // Arrange - 有効なUUIDだが存在しないユーザーID
      const nonExistentUserId = '550e8400-e29b-41d4-a716-446655440001';
      const request = new NextRequest(
        'http://localhost:3000/api/users/me/stats',
        {
          method: 'GET',
          headers: {
            'x-user-id': nonExistentUserId,
          },
        }
      );

      // Act
      const response = await GET(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(404);
      expect(data.code).toBe('RESOURCE_NOT_FOUND');
    });
  });
});
