/**
 * バリデーションエラーハンドリング
 * 要件 8.3: Zod を利用して型と実行時バリデーションを統一する
 * 要件 21.3: Zod 不正入力を 422 で弾くことを検証する
 */

import { z } from 'zod';
import {
  ERROR_CODES,
  createApiError,
} from '@template-gamma/contracts/error-codes';
import { formatZodError } from '@template-gamma/contracts/validation-schemas';
import { Logger } from '@template-gamma/adapters';

/**
 * バリデーションエラーの詳細情報
 */
export interface ValidationErrorDetail {
  field: string;
  message: string;
  value?: unknown;
}

/**
 * バリデーションエラークラス
 */
export class ValidationError extends Error {
  constructor(
    public readonly errors: ValidationErrorDetail[],
    message = 'Validation failed'
  ) {
    super(message);
    this.name = 'ValidationError';
  }

  /**
   * ZodErrorからValidationErrorを作成
   */
  static fromZodError(error: z.ZodError): ValidationError {
    const errors = formatZodError(error);
    return new ValidationError(errors);
  }

  /**
   * 単一フィールドエラーからValidationErrorを作成
   */
  static fromFieldError(
    field: string,
    message: string,
    value?: unknown
  ): ValidationError {
    return new ValidationError([{ field, message, value }]);
  }

  /**
   * APIエラーレスポンス形式に変換
   */
  toApiError() {
    return createApiError(ERROR_CODES.VALIDATION_ERROR, this.message, {
      errors: this.errors,
    });
  }
}

/**
 * バリデーションエラーハンドラー
 */
export class ValidationErrorHandler {
  constructor(private logger?: Logger) {}

  /**
   * Zodバリデーションを実行し、エラーの場合は例外を投げる
   */
  validate<T>(schema: z.ZodSchema<T>, data: unknown, context?: string): T {
    const result = schema.safeParse(data);

    if (!result.success) {
      const validationError = ValidationError.fromZodError(result.error);

      this.logger?.warn(
        {
          context,
          errors: validationError.errors,
          data: typeof data === 'object' ? JSON.stringify(data) : data,
        },
        'Validation failed'
      );

      throw validationError;
    }

    return result.data;
  }

  /**
   * 非同期でリクエストボディをバリデーション
   */
  async validateRequestBody<T>(
    request: Request,
    schema: z.ZodSchema<T>,
    context = 'request body'
  ): Promise<T> {
    try {
      const body = await request.json();
      return this.validate(schema, body, context);
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }

      // JSON解析エラー
      this.logger?.warn({ context, error }, 'Failed to parse JSON body');
      throw ValidationError.fromFieldError('body', 'Invalid JSON format');
    }
  }

  /**
   * クエリパラメータをバリデーション
   */
  validateQueryParams<T>(
    url: URL,
    schema: z.ZodSchema<T>,
    context = 'query parameters'
  ): T {
    const params = Object.fromEntries(url.searchParams.entries());
    return this.validate(schema, params, context);
  }

  /**
   * 非同期でFormDataをバリデーション
   */
  async validateFormData<T>(
    request: Request,
    schema: z.ZodSchema<T>,
    context = 'form data'
  ): Promise<T> {
    try {
      const formData = await request.formData();
      const data = Object.fromEntries(formData.entries());
      return this.validate(schema, data, context);
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }

      // FormData解析エラー
      this.logger?.warn({ context, error }, 'Failed to parse form data');
      throw ValidationError.fromFieldError(
        'formData',
        'Invalid form data format'
      );
    }
  }

  /**
   * ファイルアップロードのバリデーション
   */
  async validateFileUpload(
    request: Request,
    options: {
      maxSize?: number;
      allowedTypes?: string[];
      required?: boolean;
    } = {}
  ): Promise<File | null> {
    const {
      maxSize = 10 * 1024 * 1024, // 10MB
      allowedTypes = [
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/gif',
        'image/webp',
      ],
      required = true,
    } = options;

    try {
      const formData = await request.formData();
      const file = formData.get('file') as File | null;

      if (!file) {
        if (required) {
          throw ValidationError.fromFieldError('file', 'File is required');
        }
        return null;
      }

      // ファイルサイズチェック
      if (file.size > maxSize) {
        throw ValidationError.fromFieldError(
          'file',
          `File size must be at most ${Math.round(maxSize / 1024 / 1024)}MB`,
          { size: file.size, maxSize }
        );
      }

      // ファイルタイプチェック
      if (!allowedTypes.includes(file.type)) {
        throw ValidationError.fromFieldError(
          'file',
          `Unsupported file type. Allowed types: ${allowedTypes.join(', ')}`,
          { type: file.type, allowedTypes }
        );
      }

      // ファイル名チェック
      if (!file.name || file.name.trim() === '') {
        throw ValidationError.fromFieldError('file', 'File name is required');
      }

      // ファイル名の長さチェック
      if (file.name.length > 255) {
        throw ValidationError.fromFieldError(
          'file',
          'File name must be at most 255 characters',
          { name: file.name, length: file.name.length }
        );
      }

      // ファイル名の文字チェック（危険な文字を除外）
      // eslint-disable-next-line no-control-regex
      const invalidChars = /[<>:"/\\|?*\x00-\x1f]/;
      if (invalidChars.test(file.name)) {
        throw ValidationError.fromFieldError(
          'file',
          'File name contains invalid characters',
          { name: file.name }
        );
      }

      return file;
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }

      this.logger?.warn({ error }, 'Failed to validate file upload');
      throw ValidationError.fromFieldError(
        'file',
        'Failed to process file upload'
      );
    }
  }

  /**
   * 環境変数をバリデーション（開発時のみ）
   */
  validateEnv<T>(
    schema: z.ZodSchema<T>,
    env: Record<string, string | undefined> = process.env,
    context = 'environment variables'
  ): T {
    try {
      return this.validate(schema, env, context);
    } catch (error) {
      if (error instanceof ValidationError) {
        // 環境変数エラーは起動時の致命的エラーとして扱う
        const errorMessage = error.errors
          .map((err) => `${err.field}: ${err.message}`)
          .join(', ');
        throw new Error(`Environment validation failed: ${errorMessage}`);
      }
      throw error;
    }
  }

  /**
   * バリデーションエラーをHTTPレスポンスに変換
   */
  createErrorResponse(error: ValidationError): Response {
    const apiError = error.toApiError();
    return Response.json(apiError, { status: 422 });
  }

  /**
   * 汎用的なエラーハンドリング
   */
  handleError(error: unknown): Response {
    if (error instanceof ValidationError) {
      return this.createErrorResponse(error);
    }

    // その他のエラーは上位のエラーハンドラーに委譲
    throw error;
  }
}

/**
 * デフォルトのバリデーションエラーハンドラーインスタンス
 */
export const defaultValidationHandler = new ValidationErrorHandler();

/**
 * バリデーションエラーハンドラーのファクトリー
 */
export class ValidationErrorHandlerFactory {
  static create(logger?: Logger): ValidationErrorHandler {
    return new ValidationErrorHandler(logger);
  }
}
