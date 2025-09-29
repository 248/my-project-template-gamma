/**
 * エラーミドルウェアのテスト
 * 要件 5.5: API エラーが発生した時 THEN システムはコード + メッセージ形式で返却する
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { z } from 'zod';

// Next.jsのモック
class MockNextRequest {
  public method: string;
  public url: string;
  private _headers: Map<string, string>;

  constructor(
    url: string,
    init?: { method?: string; headers?: Record<string, string> }
  ) {
    this.url = url;
    this.method = init?.method || 'GET';
    this._headers = new Map();

    if (init?.headers) {
      Object.entries(init.headers).forEach(([key, value]) => {
        this._headers.set(key.toLowerCase(), value);
      });
    }
  }

  get headers() {
    return {
      get: (name: string): string | null => {
        return this._headers.get(name.toLowerCase()) || null;
      },
    };
  }
}

// NextRequestの型として使用
type NextRequest = MockNextRequest;

import {
  ErrorMiddleware,
  withErrorHandling,
  withAuthAndErrorHandling,
  withCorsAndErrorHandling,
  withRateLimitAndErrorHandling,
} from '../error-middleware';
import { ValidationError } from '../../validation/validation-error-handler';
import {
  AuthError,
  AuthorizationError,
  NotFoundError,
} from '../../error-handler';
import { ERROR_CODES } from '@template-gamma/contracts/error-codes';

describe('ErrorMiddleware', () => {
  let middleware: ErrorMiddleware;
  let mockLogger: {
    warn: ReturnType<typeof vi.fn>;
    error: ReturnType<typeof vi.fn>;
    info: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockLogger = {
      warn: vi.fn(),
      error: vi.fn(),
      info: vi.fn(),
    };
    middleware = new ErrorMiddleware({ logger: mockLogger });
  });

  describe('wrap', () => {
    it('should handle successful requests', async () => {
      const handler = vi
        .fn()
        .mockResolvedValue(new Response('success', { status: 200 }));
      const wrappedHandler = middleware.wrap(handler);

      const request = new MockNextRequest(
        'http://localhost/test'
      ) as NextRequest;
      const response = await wrappedHandler(request);

      expect(response.status).toBe(200);
      expect(await response.text()).toBe('success');
      expect(handler).toHaveBeenCalledWith(request);
    });

    it('should handle ValidationError', async () => {
      const validationError = ValidationError.fromFieldError(
        'name',
        'Name is required'
      );
      const handler = vi.fn().mockRejectedValue(validationError);
      const wrappedHandler = middleware.wrap(handler);

      const request = new MockNextRequest(
        'http://localhost/test'
      ) as NextRequest;
      const response = await wrappedHandler(request);

      expect(response.status).toBe(422);
      const body = await response.json();
      expect(body).toEqual({
        code: ERROR_CODES.VALIDATION_ERROR,
        message: 'Validation failed',
        details: {
          errors: [
            {
              field: 'name',
              message: 'Name is required',
            },
          ],
        },
      });
      expect(mockLogger.warn).toHaveBeenCalled();
    });

    it('should handle AuthError', async () => {
      const authError = new AuthError(
        ERROR_CODES.AUTH_REQUIRED,
        'Authentication required'
      );
      const handler = vi.fn().mockRejectedValue(authError);
      const wrappedHandler = middleware.wrap(handler);

      const request = new MockNextRequest(
        'http://localhost/test'
      ) as NextRequest;
      const response = await wrappedHandler(request);

      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body).toEqual({
        code: ERROR_CODES.AUTH_REQUIRED,
        message: 'Authentication required',
      });
      expect(mockLogger.warn).toHaveBeenCalled();
    });

    it('should handle AuthorizationError', async () => {
      const authzError = new AuthorizationError('Access denied');
      const handler = vi.fn().mockRejectedValue(authzError);
      const wrappedHandler = middleware.wrap(handler);

      const request = new MockNextRequest(
        'http://localhost/test'
      ) as NextRequest;
      const response = await wrappedHandler(request);

      expect(response.status).toBe(403);
      const body = await response.json();
      expect(body).toEqual({
        code: ERROR_CODES.FORBIDDEN,
        message: 'Access denied',
      });
      expect(mockLogger.warn).toHaveBeenCalled();
    });

    it('should handle NotFoundError', async () => {
      const notFoundError = new NotFoundError('User', '123');
      const handler = vi.fn().mockRejectedValue(notFoundError);
      const wrappedHandler = middleware.wrap(handler);

      const request = new MockNextRequest(
        'http://localhost/test'
      ) as NextRequest;
      const response = await wrappedHandler(request);

      expect(response.status).toBe(404);
      const body = await response.json();
      expect(body).toEqual({
        code: ERROR_CODES.RESOURCE_NOT_FOUND,
        message: "User with id '123' not found",
      });
      expect(mockLogger.info).toHaveBeenCalled();
    });

    it('should handle ZodError directly', async () => {
      const schema = z.object({ name: z.string().min(1) });
      const zodError = schema.safeParse({ name: '' }).error!;
      const handler = vi.fn().mockRejectedValue(zodError);
      const wrappedHandler = middleware.wrap(handler);

      const request = new MockNextRequest(
        'http://localhost/test'
      ) as NextRequest;
      const response = await wrappedHandler(request);

      expect(response.status).toBe(422);
      const body = await response.json();
      expect(body.code).toBe(ERROR_CODES.VALIDATION_ERROR);
      expect(mockLogger.warn).toHaveBeenCalled();
    });

    it('should handle generic Error', async () => {
      const genericError = new Error('Something went wrong');
      const handler = vi.fn().mockRejectedValue(genericError);
      const wrappedHandler = middleware.wrap(handler);

      const request = new MockNextRequest(
        'http://localhost/test'
      ) as NextRequest;
      const response = await wrappedHandler(request);

      expect(response.status).toBe(500);
      const body = await response.json();
      expect(body).toEqual({
        code: ERROR_CODES.INTERNAL_ERROR,
        message: '内部サーバーエラーが発生しました',
      });
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should handle unknown error', async () => {
      const unknownError = 'string error';
      const handler = vi.fn().mockRejectedValue(unknownError);
      const wrappedHandler = middleware.wrap(handler);

      const request = new MockNextRequest(
        'http://localhost/test'
      ) as NextRequest;
      const response = await wrappedHandler(request);

      expect(response.status).toBe(500);
      const body = await response.json();
      expect(body).toEqual({
        code: ERROR_CODES.INTERNAL_ERROR,
        message: 'An unknown error occurred',
      });
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should include stack trace in development mode', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const middlewareWithStack = new ErrorMiddleware({
        logger: mockLogger,
        includeStackTrace: true,
      });

      const genericError = new Error('Test error');
      const handler = vi.fn().mockRejectedValue(genericError);
      const wrappedHandler = middlewareWithStack.wrap(handler);

      const request = new MockNextRequest(
        'http://localhost/test'
      ) as NextRequest;
      const response = await wrappedHandler(request);

      expect(response.status).toBe(500);
      const body = await response.json();
      expect(body.details).toHaveProperty('stack');
      expect(body.details).toHaveProperty('name', 'Error');

      process.env.NODE_ENV = originalEnv;
    });
  });
});

describe('withErrorHandling', () => {
  it('should create wrapped handler', async () => {
    const handler = vi.fn().mockResolvedValue(new Response('success'));
    const wrappedHandler = withErrorHandling(handler);

    const request = new MockNextRequest('http://localhost/test') as NextRequest;
    const response = await wrappedHandler(request);

    expect(response.status).toBe(200);
    expect(handler).toHaveBeenCalledWith(request);
  });
});

describe('withAuthAndErrorHandling', () => {
  it('should handle authenticated request', async () => {
    const handler = vi.fn().mockResolvedValue(new Response('success'));
    const wrappedHandler = withAuthAndErrorHandling(handler);

    const request = new MockNextRequest('http://localhost/test', {
      headers: { 'x-user-id': 'user123' },
    }) as NextRequest;
    const response = await wrappedHandler(request);

    expect(response.status).toBe(200);
    expect(handler).toHaveBeenCalledWith(request);
  });

  it('should reject unauthenticated request', async () => {
    const handler = vi.fn().mockResolvedValue(new Response('success'));
    const wrappedHandler = withAuthAndErrorHandling(handler);

    const request = new MockNextRequest('http://localhost/test') as NextRequest;
    const response = await wrappedHandler(request);

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.code).toBe(ERROR_CODES.AUTH_REQUIRED);
    expect(handler).not.toHaveBeenCalled();
  });
});

describe('withCorsAndErrorHandling', () => {
  it('should handle OPTIONS request', async () => {
    const handler = vi.fn();
    const wrappedHandler = withCorsAndErrorHandling(handler);

    const request = new MockNextRequest('http://localhost/test', {
      method: 'OPTIONS',
    }) as NextRequest;
    const response = await wrappedHandler(request);

    expect(response.status).toBe(200);
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
    expect(response.headers.get('Access-Control-Allow-Methods')).toContain(
      'GET'
    );
    expect(handler).not.toHaveBeenCalled();
  });

  it('should add CORS headers to regular response', async () => {
    const handler = vi.fn().mockResolvedValue(new Response('success'));
    const wrappedHandler = withCorsAndErrorHandling(handler, {
      origin: 'https://example.com',
      methods: ['GET', 'POST'],
      headers: ['Content-Type'],
    });

    const request = new MockNextRequest('http://localhost/test') as NextRequest;
    const response = await wrappedHandler(request);

    expect(response.status).toBe(200);
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe(
      'https://example.com'
    );
    expect(response.headers.get('Access-Control-Allow-Methods')).toBe(
      'GET, POST'
    );
    expect(response.headers.get('Access-Control-Allow-Headers')).toBe(
      'Content-Type'
    );
  });
});

describe('withRateLimitAndErrorHandling', () => {
  it('should allow requests within rate limit', async () => {
    const handler = vi.fn().mockResolvedValue(new Response('success'));
    const wrappedHandler = withRateLimitAndErrorHandling(handler, {
      maxRequests: 5,
      windowMs: 60000,
    });

    const request = new MockNextRequest('http://localhost/test', {
      headers: { 'x-forwarded-for': '192.168.1.1' },
    }) as NextRequest;

    // 5回のリクエストは成功するはず
    for (let i = 0; i < 5; i++) {
      const response = await wrappedHandler(request);
      expect(response.status).toBe(200);
    }
  });

  it('should reject requests exceeding rate limit', async () => {
    const handler = vi.fn().mockResolvedValue(new Response('success'));
    const wrappedHandler = withRateLimitAndErrorHandling(handler, {
      maxRequests: 2,
      windowMs: 60000,
    });

    const request = new MockNextRequest('http://localhost/test', {
      headers: { 'x-forwarded-for': '192.168.1.1' },
    }) as NextRequest;

    // 最初の2回は成功
    for (let i = 0; i < 2; i++) {
      const response = await wrappedHandler(request);
      expect(response.status).toBe(200);
    }

    // 3回目は制限に引っかかる
    const response = await wrappedHandler(request);
    expect(response.status).toBe(429);
    const body = await response.json();
    expect(body.code).toBe(ERROR_CODES.RATE_LIMIT_EXCEEDED);
  });

  it('should use custom key generator', async () => {
    const handler = vi.fn().mockResolvedValue(new Response('success'));
    const wrappedHandler = withRateLimitAndErrorHandling(handler, {
      maxRequests: 1,
      windowMs: 60000,
      keyGenerator: (req) => req.headers.get('x-user-id') || 'anonymous',
    });

    // 異なるユーザーIDでのリクエストは独立してカウントされる
    const request1 = new MockNextRequest('http://localhost/test', {
      headers: { 'x-user-id': 'user1' },
    }) as NextRequest;
    const request2 = new MockNextRequest('http://localhost/test', {
      headers: { 'x-user-id': 'user2' },
    }) as NextRequest;

    const response1 = await wrappedHandler(request1);
    const response2 = await wrappedHandler(request2);

    expect(response1.status).toBe(200);
    expect(response2.status).toBe(200);

    // 同じユーザーの2回目のリクエストは制限される
    const response3 = await wrappedHandler(request1);
    expect(response3.status).toBe(429);
  });
});

// 統合テスト
describe('Integration Tests', () => {
  it('should handle complex error scenarios', async () => {
    const handler = vi.fn().mockImplementation(async (request: NextRequest) => {
      const url = new URL(request.url);
      const action = url.searchParams.get('action');

      switch (action) {
        case 'validation':
          throw ValidationError.fromFieldError('name', 'Name is required');
        case 'auth':
          throw new AuthError();
        case 'not-found':
          throw new NotFoundError('User', '123');
        case 'generic':
          throw new Error('Generic error');
        default:
          return new Response('success');
      }
    });

    const wrappedHandler = withErrorHandling(handler);

    // 成功ケース
    const successRequest = new MockNextRequest(
      'http://localhost/test'
    ) as NextRequest;
    const successResponse = await wrappedHandler(successRequest);
    expect(successResponse.status).toBe(200);

    // バリデーションエラー
    const validationRequest = new MockNextRequest(
      'http://localhost/test?action=validation'
    ) as NextRequest;
    const validationResponse = await wrappedHandler(validationRequest);
    expect(validationResponse.status).toBe(422);

    // 認証エラー
    const authRequest = new MockNextRequest(
      'http://localhost/test?action=auth'
    ) as NextRequest;
    const authResponse = await wrappedHandler(authRequest);
    expect(authResponse.status).toBe(401);

    // 404エラー
    const notFoundRequest = new MockNextRequest(
      'http://localhost/test?action=not-found'
    ) as NextRequest;
    const notFoundResponse = await wrappedHandler(notFoundRequest);
    expect(notFoundResponse.status).toBe(404);

    // 汎用エラー
    const genericRequest = new MockNextRequest(
      'http://localhost/test?action=generic'
    ) as NextRequest;
    const genericResponse = await wrappedHandler(genericRequest);
    expect(genericResponse.status).toBe(500);
  });
});
