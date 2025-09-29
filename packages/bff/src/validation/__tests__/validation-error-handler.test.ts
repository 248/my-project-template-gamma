/**
 * バリデーションエラーハンドラーのテスト
 * 要件 21.3: Zod 不正入力を 422 で弾くことを検証する
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { z } from 'zod';
import {
  ValidationError,
  ValidationErrorHandler,
  ValidationErrorHandlerFactory,
} from '../validation-error-handler';
import { ERROR_CODES } from '@template-gamma/contracts/error-codes';

describe('ValidationError', () => {
  describe('fromZodError', () => {
    it('should create ValidationError from ZodError', () => {
      const schema = z.object({
        name: z.string().min(1),
        age: z.number().min(0),
      });

      const result = schema.safeParse({ name: '', age: -1 });
      expect(result.success).toBe(false);

      if (!result.success) {
        const validationError = ValidationError.fromZodError(result.error);

        expect(validationError).toBeInstanceOf(ValidationError);
        expect(validationError.errors).toHaveLength(2);
        expect(validationError.errors[0]).toMatchObject({
          field: 'name',
          message: expect.stringContaining('at least 1'),
        });
        expect(validationError.errors[1]).toMatchObject({
          field: 'age',
          message: expect.stringContaining('greater than or equal to 0'),
        });
      }
    });
  });

  describe('fromFieldError', () => {
    it('should create ValidationError from single field error', () => {
      const error = ValidationError.fromFieldError(
        'email',
        'Invalid email format',
        'invalid-email'
      );

      expect(error.errors).toHaveLength(1);
      expect(error.errors[0]).toEqual({
        field: 'email',
        message: 'Invalid email format',
        value: 'invalid-email',
      });
    });
  });

  describe('toApiError', () => {
    it('should convert to API error format', () => {
      const error = ValidationError.fromFieldError('name', 'Name is required');
      const apiError = error.toApiError();

      expect(apiError).toEqual({
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
    });
  });
});

describe('ValidationErrorHandler', () => {
  let handler: ValidationErrorHandler;
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
    handler = new ValidationErrorHandler(mockLogger);
  });

  describe('validate', () => {
    it('should return validated data for valid input', () => {
      const schema = z.object({
        name: z.string(),
        age: z.number(),
      });

      const data = { name: 'John', age: 30 };
      const result = handler.validate(schema, data);

      expect(result).toEqual(data);
    });

    it('should throw ValidationError for invalid input', () => {
      const schema = z.object({
        name: z.string().min(1),
        age: z.number().min(0),
      });

      const data = { name: '', age: -1 };

      expect(() => handler.validate(schema, data)).toThrow(ValidationError);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.objectContaining({
          errors: expect.arrayContaining([
            expect.objectContaining({
              field: 'name',
              message: expect.any(String),
            }),
            expect.objectContaining({
              field: 'age',
              message: expect.any(String),
            }),
          ]),
        }),
        'Validation failed'
      );
    });
  });

  describe('validateRequestBody', () => {
    it('should validate JSON request body', async () => {
      const schema = z.object({
        name: z.string(),
        age: z.number(),
      });

      const mockRequest = new Request('http://localhost', {
        method: 'POST',
        body: JSON.stringify({ name: 'John', age: 30 }),
        headers: { 'Content-Type': 'application/json' },
      });

      const result = await handler.validateRequestBody(mockRequest, schema);
      expect(result).toEqual({ name: 'John', age: 30 });
    });

    it('should throw ValidationError for invalid JSON', async () => {
      const schema = z.object({
        name: z.string(),
      });

      const mockRequest = new Request('http://localhost', {
        method: 'POST',
        body: 'invalid json',
        headers: { 'Content-Type': 'application/json' },
      });

      await expect(
        handler.validateRequestBody(mockRequest, schema)
      ).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError for invalid data', async () => {
      const schema = z.object({
        name: z.string().min(1),
      });

      const mockRequest = new Request('http://localhost', {
        method: 'POST',
        body: JSON.stringify({ name: '' }),
        headers: { 'Content-Type': 'application/json' },
      });

      await expect(
        handler.validateRequestBody(mockRequest, schema)
      ).rejects.toThrow(ValidationError);
    });
  });

  describe('validateQueryParams', () => {
    it('should validate query parameters', () => {
      const schema = z.object({
        page: z.coerce.number().min(1),
        limit: z.coerce.number().max(100),
      });

      const url = new URL('http://localhost?page=2&limit=20');
      const result = handler.validateQueryParams(url, schema);

      expect(result).toEqual({ page: 2, limit: 20 });
    });

    it('should throw ValidationError for invalid query params', () => {
      const schema = z.object({
        page: z.coerce.number().min(1),
      });

      const url = new URL('http://localhost?page=0');

      expect(() => handler.validateQueryParams(url, schema)).toThrow(
        ValidationError
      );
    });
  });

  describe('validateFileUpload', () => {
    it('should validate file upload', async () => {
      const file = new File(['test content'], 'test.jpg', {
        type: 'image/jpeg',
      });
      const formData = new FormData();
      formData.append('file', file);

      const mockRequest = new Request('http://localhost', {
        method: 'POST',
        body: formData,
      });

      const result = await handler.validateFileUpload(mockRequest);
      expect(result).toBeInstanceOf(File);
      expect(result?.name).toBe('test.jpg');
      expect(result?.type).toBe('image/jpeg');
    });

    it('should throw ValidationError for missing file when required', async () => {
      const formData = new FormData();

      const mockRequest = new Request('http://localhost', {
        method: 'POST',
        body: formData,
      });

      await expect(
        handler.validateFileUpload(mockRequest, { required: true })
      ).rejects.toThrow(ValidationError);
    });

    it('should return null for missing file when not required', async () => {
      const formData = new FormData();

      const mockRequest = new Request('http://localhost', {
        method: 'POST',
        body: formData,
      });

      const result = await handler.validateFileUpload(mockRequest, {
        required: false,
      });
      expect(result).toBeNull();
    });

    it('should throw ValidationError for file too large', async () => {
      const file = new File(['x'.repeat(1000)], 'test.jpg', {
        type: 'image/jpeg',
      });
      const formData = new FormData();
      formData.append('file', file);

      const mockRequest = new Request('http://localhost', {
        method: 'POST',
        body: formData,
      });

      await expect(
        handler.validateFileUpload(mockRequest, { maxSize: 500 })
      ).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError for unsupported file type', async () => {
      const file = new File(['test content'], 'test.txt', {
        type: 'text/plain',
      });
      const formData = new FormData();
      formData.append('file', file);

      const mockRequest = new Request('http://localhost', {
        method: 'POST',
        body: formData,
      });

      await expect(
        handler.validateFileUpload(mockRequest, {
          allowedTypes: ['image/jpeg'],
        })
      ).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError for invalid filename', async () => {
      const file = new File(['test content'], 'test<>.jpg', {
        type: 'image/jpeg',
      });
      const formData = new FormData();
      formData.append('file', file);

      const mockRequest = new Request('http://localhost', {
        method: 'POST',
        body: formData,
      });

      await expect(handler.validateFileUpload(mockRequest)).rejects.toThrow(
        ValidationError
      );
    });
  });

  describe('createErrorResponse', () => {
    it('should create 422 error response', () => {
      const error = ValidationError.fromFieldError('name', 'Name is required');
      const response = handler.createErrorResponse(error);

      expect(response.status).toBe(422);
    });
  });

  describe('handleError', () => {
    it('should handle ValidationError', () => {
      const error = ValidationError.fromFieldError('name', 'Name is required');
      const response = handler.handleError(error);

      expect(response.status).toBe(422);
    });

    it('should re-throw non-ValidationError', () => {
      const error = new Error('Some other error');

      expect(() => handler.handleError(error)).toThrow(error);
    });
  });
});

describe('ValidationErrorHandlerFactory', () => {
  it('should create ValidationErrorHandler instance', () => {
    const mockLogger = { warn: vi.fn(), error: vi.fn(), info: vi.fn() };
    const handler = ValidationErrorHandlerFactory.create(mockLogger);

    expect(handler).toBeInstanceOf(ValidationErrorHandler);
  });
});

// 統合テスト：実際のAPIリクエストのシミュレーション
describe('Integration Tests', () => {
  let handler: ValidationErrorHandler;

  beforeEach(() => {
    handler = new ValidationErrorHandler();
  });

  it('should handle complete API request validation flow', async () => {
    // スキーマ定義
    const bodySchema = z.object({
      name: z.string().min(1),
      email: z.string().email(),
    });

    const querySchema = z.object({
      page: z.coerce.number().min(1).default(1),
    });

    // 有効なリクエスト
    const validRequest = new Request('http://localhost?page=1', {
      method: 'POST',
      body: JSON.stringify({ name: 'John', email: 'john@example.com' }),
      headers: { 'Content-Type': 'application/json' },
    });

    const url = new URL(validRequest.url);
    const queryParams = handler.validateQueryParams(url, querySchema);
    const bodyData = await handler.validateRequestBody(
      validRequest,
      bodySchema
    );

    expect(queryParams).toEqual({ page: 1 });
    expect(bodyData).toEqual({ name: 'John', email: 'john@example.com' });
  });

  it('should handle validation errors in API request flow', async () => {
    const bodySchema = z.object({
      name: z.string().min(1),
      email: z.string().email(),
    });

    // 無効なリクエスト
    const invalidRequest = new Request('http://localhost', {
      method: 'POST',
      body: JSON.stringify({ name: '', email: 'invalid-email' }),
      headers: { 'Content-Type': 'application/json' },
    });

    await expect(
      handler.validateRequestBody(invalidRequest, bodySchema)
    ).rejects.toThrow(ValidationError);
  });
});
