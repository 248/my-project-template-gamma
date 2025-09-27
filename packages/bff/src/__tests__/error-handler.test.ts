/**
 * エラーハンドラーのテスト
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  ApiErrorHandler,
  BffError,
  ValidationError,
  AuthError,
  AuthorizationError,
  NotFoundError,
  createErrorResponse,
  createValidationErrorResponse,
  createAuthErrorResponse,
  createForbiddenErrorResponse,
  createNotFoundErrorResponse,
} from '../error-handler.js';
import { ERROR_CODES } from '@template-gamma/contracts/error-codes';
import { createMockLogger } from './helpers/mocks.js';

describe('ApiErrorHandler', () => {
  let errorHandler: ApiErrorHandler;
  let mockLogger: ReturnType<typeof createMockLogger>;

  beforeEach(() => {
    mockLogger = createMockLogger();
    errorHandler = new ApiErrorHandler(mockLogger);
  });

  describe('handle', () => {
    it('should handle BffError correctly', async () => {
      const error = new BffError(
        ERROR_CODES.VALIDATION_ERROR,
        'Test validation error'
      );
      const response = errorHandler.handle(error);

      expect(response.status).toBe(400);

      const body = await response.json();
      expect(body).toEqual({
        code: ERROR_CODES.VALIDATION_ERROR,
        message: 'Test validation error',
      });
    });

    it('should handle ValidationError correctly', async () => {
      const error = new ValidationError('Test validation error', {
        field: 'test',
      });
      const response = errorHandler.handle(error);

      expect(response.status).toBe(400);

      const body = await response.json();
      expect(body).toEqual({
        code: ERROR_CODES.VALIDATION_ERROR,
        message: 'Test validation error',
        details: { field: 'test' },
      });
    });

    it('should handle AuthError correctly', async () => {
      const error = new AuthError(
        ERROR_CODES.AUTH_REQUIRED,
        'Authentication required'
      );
      const response = errorHandler.handle(error);

      expect(response.status).toBe(401);

      const body = await response.json();
      expect(body).toEqual({
        code: ERROR_CODES.AUTH_REQUIRED,
        message: 'Authentication required',
      });
    });

    it('should handle AuthorizationError correctly', async () => {
      const error = new AuthorizationError('Access denied');
      const response = errorHandler.handle(error);

      expect(response.status).toBe(403);

      const body = await response.json();
      expect(body).toEqual({
        code: ERROR_CODES.FORBIDDEN,
        message: 'Access denied',
      });
    });

    it('should handle NotFoundError correctly', async () => {
      const error = new NotFoundError('User', '123');
      const response = errorHandler.handle(error);

      expect(response.status).toBe(404);

      const body = await response.json();
      expect(body).toEqual({
        code: ERROR_CODES.RESOURCE_NOT_FOUND,
        message: "User with id '123' not found",
      });
    });

    it('should handle generic Error as internal error', async () => {
      const error = new Error('Unexpected error');
      const response = errorHandler.handle(error);

      expect(response.status).toBe(500);

      const body = await response.json();
      expect(body).toEqual({
        code: ERROR_CODES.INTERNAL_ERROR,
        message: '内部サーバーエラーが発生しました',
      });

      expect(mockLogger.error).toHaveBeenCalledWith(
        { err: error },
        'Unhandled error in BFF layer'
      );
    });

    it('should handle unknown error as internal error', async () => {
      const error = 'string error';
      const response = errorHandler.handle(error);

      expect(response.status).toBe(500);

      const body = await response.json();
      expect(body).toEqual({
        code: ERROR_CODES.INTERNAL_ERROR,
        message: '内部サーバーエラーが発生しました',
      });

      expect(mockLogger.error).toHaveBeenCalledWith(
        { error },
        'Unknown error in BFF layer'
      );
    });
  });

  describe('logError', () => {
    it('should log BffError as warning', () => {
      const error = new BffError(ERROR_CODES.VALIDATION_ERROR, 'Test error', {
        field: 'test',
      });
      const context = { userId: '123' };

      errorHandler.logError(error, context);

      expect(mockLogger.warn).toHaveBeenCalledWith(
        {
          code: ERROR_CODES.VALIDATION_ERROR,
          message: 'Test error',
          details: { field: 'test' },
          userId: '123',
        },
        'BFF error occurred'
      );
    });

    it('should log unexpected error as error', () => {
      const error = new Error('Unexpected error');
      const context = { userId: '123' };

      errorHandler.logError(error, context);

      expect(mockLogger.error).toHaveBeenCalledWith(
        {
          err: error,
          userId: '123',
        },
        'Unexpected error in BFF layer'
      );
    });
  });
});

describe('Custom Error Classes', () => {
  describe('BffError', () => {
    it('should create BffError with code and message', () => {
      const error = new BffError(ERROR_CODES.INTERNAL_ERROR, 'Test error');

      expect(error.name).toBe('BffError');
      expect(error.code).toBe(ERROR_CODES.INTERNAL_ERROR);
      expect(error.message).toBe('Test error');
      expect(error.details).toBeUndefined();
    });

    it('should create BffError with details', () => {
      const details = { field: 'test' };
      const error = new BffError(
        ERROR_CODES.VALIDATION_ERROR,
        'Test error',
        details
      );

      expect(error.details).toEqual(details);
    });
  });

  describe('ValidationError', () => {
    it('should create ValidationError with correct code', () => {
      const error = new ValidationError('Validation failed');

      expect(error.name).toBe('ValidationError');
      expect(error.code).toBe(ERROR_CODES.VALIDATION_ERROR);
      expect(error.message).toBe('Validation failed');
    });
  });

  describe('AuthError', () => {
    it('should create AuthError with default code', () => {
      const error = new AuthError();

      expect(error.name).toBe('AuthError');
      expect(error.code).toBe(ERROR_CODES.AUTH_REQUIRED);
    });

    it('should create AuthError with custom code', () => {
      const error = new AuthError(ERROR_CODES.AUTH_EXPIRED, 'Token expired');

      expect(error.code).toBe(ERROR_CODES.AUTH_EXPIRED);
      expect(error.message).toBe('Token expired');
    });
  });

  describe('AuthorizationError', () => {
    it('should create AuthorizationError with correct code', () => {
      const error = new AuthorizationError('Access denied');

      expect(error.name).toBe('AuthorizationError');
      expect(error.code).toBe(ERROR_CODES.FORBIDDEN);
      expect(error.message).toBe('Access denied');
    });
  });

  describe('NotFoundError', () => {
    it('should create NotFoundError with resource name only', () => {
      const error = new NotFoundError('User');

      expect(error.name).toBe('NotFoundError');
      expect(error.code).toBe(ERROR_CODES.RESOURCE_NOT_FOUND);
      expect(error.message).toBe('User not found');
    });

    it('should create NotFoundError with resource name and ID', () => {
      const error = new NotFoundError('User', '123');

      expect(error.message).toBe("User with id '123' not found");
    });
  });
});

describe('Helper Functions', () => {
  describe('createErrorResponse', () => {
    it('should create error response with correct status and body', async () => {
      const response = createErrorResponse(
        ERROR_CODES.VALIDATION_ERROR,
        'Test error',
        { field: 'test' }
      );

      expect(response.status).toBe(400);

      const body = await response.json();
      expect(body).toEqual({
        code: ERROR_CODES.VALIDATION_ERROR,
        message: 'Test error',
        details: { field: 'test' },
      });
    });
  });

  describe('createValidationErrorResponse', () => {
    it('should create validation error response', async () => {
      const errors = [{ field: 'email', message: 'Invalid email' }];
      const response = createValidationErrorResponse(errors);

      expect(response.status).toBe(400);

      const body = await response.json();
      expect(body).toEqual({
        code: ERROR_CODES.VALIDATION_ERROR,
        message: 'Validation failed',
        details: { errors },
      });
    });
  });

  describe('createAuthErrorResponse', () => {
    it('should create auth error response', async () => {
      const response = createAuthErrorResponse('Custom auth message');

      expect(response.status).toBe(401);

      const body = await response.json();
      expect(body).toEqual({
        code: ERROR_CODES.AUTH_REQUIRED,
        message: 'Custom auth message',
      });
    });
  });

  describe('createForbiddenErrorResponse', () => {
    it('should create forbidden error response', async () => {
      const response = createForbiddenErrorResponse('Access denied');

      expect(response.status).toBe(403);

      const body = await response.json();
      expect(body).toEqual({
        code: ERROR_CODES.FORBIDDEN,
        message: 'Access denied',
      });
    });
  });

  describe('createNotFoundErrorResponse', () => {
    it('should create not found error response', async () => {
      const response = createNotFoundErrorResponse('User', '123');

      expect(response.status).toBe(404);

      const body = await response.json();
      expect(body).toEqual({
        code: ERROR_CODES.RESOURCE_NOT_FOUND,
        message: "User with id '123' not found",
      });
    });
  });
});
