import { vi } from 'vitest';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';

// Adapter モック
export const mockSupabaseAdapter = {
  ping: vi.fn().mockResolvedValue(true),
  createUser: vi.fn(),
  updateLastLogin: vi.fn(),
  getCurrentUser: vi.fn(),
  signInWithOAuth: vi.fn(),
  exchangeCodeForSession: vi.fn(),
  signOut: vi.fn(),
  getUser: vi.fn(),
};

export const mockStorageAdapter = {
  ping: vi.fn().mockResolvedValue(true),
  uploadFile: vi.fn(),
  getSignedUrl: vi.fn(),
  deleteFile: vi.fn(),
};

export const mockLogger = {
  info: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  debug: vi.fn(),
};

// MSW サーバーセットアップ
export const server = setupServer(
  // Health API モック
  http.get('/api/healthz', () => {
    return HttpResponse.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
    });
  }),

  http.get('/api/readyz', () => {
    return HttpResponse.json({
      status: 'ok',
      dependencies: [
        { name: 'supabase', status: 'ok', latency: 45 },
        { name: 'storage', status: 'ok', latency: 32 },
      ],
      version: '1.0.0',
      commit: 'abc123',
      buildTime: '2024-01-01T00:00:00Z',
    });
  }),

  http.get('/api/diag', ({ request }) => {
    const authHeader = request.headers.get('Cookie');
    if (!authHeader?.includes('sb-access-token')) {
      return HttpResponse.json(
        { code: 'AUTH_REQUIRED', message: 'Authentication required' },
        { status: 401 }
      );
    }

    return HttpResponse.json({
      status: 'ok',
      dependencies: [
        { name: 'supabase', status: 'ok', latency: 45 },
        { name: 'storage', status: 'ok', latency: 32 },
      ],
      system: {
        uptime: 12345,
        memory: {
          used: 123456789,
          total: 987654321,
        },
        nodeVersion: '22.0.0',
      },
      version: '1.0.0',
      commit: 'abc123',
      buildTime: '2024-01-01T00:00:00Z',
    });
  }),

  // Auth API モック
  http.get('/api/auth/login', () => {
    return HttpResponse.redirect('/auth/callback?code=mock-auth-code');
  }),

  http.get('/api/auth/callback', () => {
    return HttpResponse.redirect('/home', {
      headers: {
        'Set-Cookie':
          'sb-access-token=mock-token; HttpOnly; Path=/; SameSite=Lax',
      },
    });
  }),

  http.post('/api/auth/logout', () => {
    return HttpResponse.json(
      { success: true },
      {
        headers: {
          'Set-Cookie':
            'sb-access-token=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0',
        },
      }
    );
  }),

  http.get('/api/auth/me', ({ request }) => {
    const authHeader = request.headers.get('Cookie');
    if (!authHeader?.includes('sb-access-token')) {
      return HttpResponse.json(
        { code: 'AUTH_REQUIRED', message: 'Authentication required' },
        { status: 401 }
      );
    }

    return HttpResponse.json({
      id: 'mock-user-id',
      email: 'test@example.com',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
      lastLoginAt: new Date().toISOString(),
    });
  }),

  // Images API モック
  http.get('/api/images', ({ request }) => {
    const authHeader = request.headers.get('Cookie');
    if (!authHeader?.includes('sb-access-token')) {
      return HttpResponse.json(
        { code: 'AUTH_REQUIRED', message: 'Authentication required' },
        { status: 401 }
      );
    }

    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '20');

    // バリデーションエラーのシミュレート
    if (isNaN(page) || isNaN(limit)) {
      return HttpResponse.json(
        {
          code: 'VALIDATION_ERROR',
          message: 'Invalid query parameters',
          details: {
            page: isNaN(page) ? ['Must be a number'] : undefined,
            limit: isNaN(limit) ? ['Must be a number'] : undefined,
          },
        },
        { status: 422 }
      );
    }

    return HttpResponse.json({
      images: [
        {
          id: 'image-1',
          filename: 'test1.jpg',
          status: 'ready',
          createdAt: '2024-01-01T00:00:00Z',
        },
        {
          id: 'image-2',
          filename: 'test2.png',
          status: 'processing',
          createdAt: '2024-01-01T01:00:00Z',
        },
      ],
      pagination: {
        page,
        limit,
        total: 2,
        hasNext: false,
      },
    });
  }),

  http.post('/api/images', async ({ request }) => {
    const authHeader = request.headers.get('Cookie');
    if (!authHeader?.includes('sb-access-token')) {
      return HttpResponse.json(
        { code: 'AUTH_REQUIRED', message: 'Authentication required' },
        { status: 401 }
      );
    }

    const contentType = request.headers.get('Content-Type');

    // バリデーションエラーのシミュレート
    if (!contentType?.includes('multipart/form-data')) {
      return HttpResponse.json(
        {
          code: 'VALIDATION_ERROR',
          message: 'File upload required',
        },
        { status: 422 }
      );
    }

    return HttpResponse.json(
      {
        id: 'new-image-id',
        filename: 'uploaded.jpg',
        status: 'uploading',
        createdAt: new Date().toISOString(),
      },
      { status: 201 }
    );
  }),

  // Users API モック
  http.get('/api/users/me', ({ request }) => {
    const authHeader = request.headers.get('Cookie');
    if (!authHeader?.includes('sb-access-token')) {
      return HttpResponse.json(
        { code: 'AUTH_REQUIRED', message: 'Authentication required' },
        { status: 401 }
      );
    }

    return HttpResponse.json({
      id: 'mock-user-id',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
      lastLoginAt: new Date().toISOString(),
    });
  }),

  // Supabase Auth モック
  http.post('https://*/auth/v1/token', () => {
    return HttpResponse.json({
      access_token: 'mock-access-token',
      refresh_token: 'mock-refresh-token',
      user: { id: 'mock-user-id', email: 'test@example.com' },
    });
  }),

  http.get('https://*/auth/v1/user', ({ request }) => {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.includes('Bearer')) {
      return HttpResponse.json(
        { error: { message: 'Invalid token' } },
        { status: 401 }
      );
    }

    return HttpResponse.json({
      user: { id: 'mock-user-id', email: 'test@example.com' },
    });
  })
);

// テスト用のファクトリー関数
export function createMockUser(overrides = {}) {
  return {
    id: 'mock-user-id',
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z'),
    lastLoginAt: new Date('2024-01-01T00:00:00Z'),
    ...overrides,
  };
}

export function createMockImage(overrides = {}) {
  return {
    id: 'mock-image-id',
    userId: 'mock-user-id',
    filename: 'test.jpg',
    status: 'ready' as const,
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z'),
    ...overrides,
  };
}

export function createMockHealthCheck(overrides = {}) {
  return {
    name: 'test-service',
    status: 'ok' as const,
    latency: 50,
    ...overrides,
  };
}
