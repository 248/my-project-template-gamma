/**
 * アプリケーション全体で使用するZodバリデーションスキーマ
 * 要件 8.3: Zod を利用して型と実行時バリデーションを統一する
 */

import { z } from 'zod';

/**
 * 共通バリデーションスキーマ
 */
export const CommonSchemas = {
  // UUID形式の検証
  uuid: z.string().uuid('Invalid UUID format'),

  // ページネーション
  pagination: z.object({
    page: z.coerce.number().min(1, 'Page must be at least 1').default(1),
    limit: z.coerce
      .number()
      .min(1, 'Limit must be at least 1')
      .max(100, 'Limit must be at most 100')
      .default(20),
  }),

  // 日時
  dateTime: z.string().datetime('Invalid datetime format'),

  // ファイルサイズ（バイト）
  fileSize: z.number().min(0, 'File size must be non-negative'),

  // MIMEタイプ
  // eslint-disable-next-line no-useless-escape
  mimeType: z.string().regex(/^[a-z]+\/[a-z0-9\-\+\.]+$/i, 'Invalid MIME type'),
};

/**
 * 画像関連のバリデーションスキーマ
 */
export const ImageSchemas = {
  // 画像ファイルのバリデーション
  imageFile: z.object({
    filename: z
      .string()
      .min(1, 'Filename is required')
      .max(255, 'Filename must be at most 255 characters')
      .regex(
        // eslint-disable-next-line no-control-regex
        /^[^<>:"/\\|?*\x00-\x1f]+$/,
        'Filename contains invalid characters'
      ),
    size: z
      .number()
      .min(1, 'File size must be greater than 0')
      .max(10 * 1024 * 1024, 'File size must be at most 10MB'), // 10MB制限
    mimeType: z
      .string()
      .regex(/^image\/(jpeg|jpg|png|gif|webp)$/i, 'Unsupported image format'),
  }),

  // 画像ステータス
  imageStatus: z.enum(['uploading', 'processing', 'ready', 'failed'], {
    errorMap: () => ({ message: 'Invalid image status' }),
  }),

  // 画像レスポンス
  imageResponse: z.object({
    id: CommonSchemas.uuid,
    filename: z.string(),
    status: z.enum(['uploading', 'processing', 'ready', 'failed']),
    fileSize: z.number().optional(),
    mimeType: z.string().optional(),
    createdAt: CommonSchemas.dateTime,
    updatedAt: CommonSchemas.dateTime,
  }),

  // 画像一覧レスポンス
  imageListResponse: z.object({
    images: z.array(z.lazy(() => ImageSchemas.imageResponse)),
    pagination: z.object({
      page: z.number(),
      limit: z.number(),
      total: z.number(),
      hasNext: z.boolean(),
    }),
  }),

  // 画像アップロードリクエスト
  uploadRequest: z.object({
    file: z.instanceof(File, { message: 'File is required' }),
  }),
};

/**
 * ユーザー関連のバリデーションスキーマ
 */
export const UserSchemas = {
  // ユーザーレスポンス
  userResponse: z.object({
    id: CommonSchemas.uuid,
    createdAt: CommonSchemas.dateTime,
    updatedAt: CommonSchemas.dateTime,
    lastLoginAt: CommonSchemas.dateTime,
  }),

  // ユーザー統計レスポンス
  userStatsResponse: z.object({
    totalImages: z.number().min(0, 'Total images must be non-negative'),
    readyImages: z.number().min(0, 'Ready images must be non-negative'),
    processingImages: z
      .number()
      .min(0, 'Processing images must be non-negative'),
    failedImages: z.number().min(0, 'Failed images must be non-negative'),
  }),
};

/**
 * ヘルスチェック関連のバリデーションスキーマ
 */
export const HealthSchemas = {
  // ヘルスチェック結果
  healthCheck: z.object({
    name: z.string().min(1, 'Health check name is required'),
    status: z.enum(['ok', 'degraded', 'down'], {
      errorMap: () => ({ message: 'Invalid health status' }),
    }),
    latency: z.number().min(0, 'Latency must be non-negative').optional(),
    error: z.string().optional(),
  }),

  // Liveness レスポンス
  livenessResponse: z.object({
    status: z.literal('ok'),
    timestamp: CommonSchemas.dateTime,
  }),

  // Readiness レスポンス
  readinessResponse: z.object({
    status: z.enum(['ok', 'degraded', 'down']),
    dependencies: z.array(z.lazy(() => HealthSchemas.healthCheck)),
    version: z.string(),
    commit: z.string(),
    buildTime: z.string(),
  }),

  // Diagnostics レスポンス
  diagnosticsResponse: z.object({
    status: z.enum(['ok', 'degraded', 'down']),
    dependencies: z.array(z.lazy(() => HealthSchemas.healthCheck)),
    version: z.string(),
    commit: z.string(),
    buildTime: z.string(),
    uptime: z.number().min(0, 'Uptime must be non-negative'),
    memory: z
      .object({
        used: z.number().min(0),
        total: z.number().min(0),
        percentage: z.number().min(0).max(100),
      })
      .optional(),
  }),
};

/**
 * エラーレスポンス関連のバリデーションスキーマ
 */
export const ErrorSchemas = {
  // APIエラーレスポンス
  apiError: z.object({
    code: z.string().min(1, 'Error code is required'),
    message: z.string().min(1, 'Error message is required'),
    details: z.record(z.unknown()).optional(),
  }),

  // バリデーションエラーの詳細
  validationErrorDetail: z.object({
    field: z.string().min(1, 'Field name is required'),
    message: z.string().min(1, 'Error message is required'),
    value: z.unknown().optional(),
  }),

  // バリデーションエラーレスポンス
  validationErrorResponse: z.object({
    code: z.literal('VALIDATION_ERROR'),
    message: z.string(),
    details: z.object({
      errors: z.array(z.lazy(() => ErrorSchemas.validationErrorDetail)),
    }),
  }),
};

/**
 * 環境変数のバリデーションスキーマ
 */
export const EnvSchemas = {
  // 基本環境変数
  base: z.object({
    NODE_ENV: z
      .enum(['development', 'production', 'test'])
      .default('development'),
    BACKEND_MODE: z.enum(['monolith', 'service']).default('monolith'),
    LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
    APP_VERSION: z.string().default('1.0.0'),
    GIT_COMMIT: z.string().default('unknown'),
    BUILD_TIME: z.string().default(new Date().toISOString()),
  }),

  // Supabase関連
  supabase: z.object({
    SUPABASE_URL: z.string().url('Invalid Supabase URL').optional(),
    SUPABASE_ANON_KEY: z
      .string()
      .min(1, 'Supabase anon key is required')
      .optional(),
    SUPABASE_SERVICE_ROLE_KEY: z
      .string()
      .min(1, 'Supabase service role key is required')
      .optional(),
  }),

  // Sentry関連
  sentry: z.object({
    SENTRY_DSN: z.string().url('Invalid Sentry DSN').optional(),
  }),
};

/**
 * Zodエラーを構造化されたバリデーションエラーに変換するヘルパー関数
 */
export function formatZodError(error: z.ZodError): Array<{
  field: string;
  message: string;
  value?: unknown;
}> {
  return error.errors.map((err) => ({
    field: err.path.join('.'),
    message: err.message,
    value: err.code === 'invalid_type' ? err.received : undefined,
  }));
}

/**
 * Zodバリデーションを実行し、エラーを統一形式で返すヘルパー関数
 */
export function validateWithZod<T>(
  schema: z.ZodSchema<T>,
  data: unknown
):
  | { success: true; data: T }
  | {
      success: false;
      errors: Array<{ field: string; message: string; value?: unknown }>;
    } {
  const result = schema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  }

  return { success: false, errors: formatZodError(result.error) };
}

/**
 * 型安全なバリデーション関数
 */
export class ValidationHelper {
  /**
   * リクエストボディをバリデーションする
   */
  static async validateRequestBody<T>(
    request: Request,
    schema: z.ZodSchema<T>
  ): Promise<
    | { success: true; data: T }
    | {
        success: false;
        errors: Array<{ field: string; message: string; value?: unknown }>;
      }
  > {
    try {
      const body = await request.json();
      return validateWithZod(schema, body);
    } catch {
      return {
        success: false,
        errors: [{ field: 'body', message: 'Invalid JSON format' }],
      };
    }
  }

  /**
   * クエリパラメータをバリデーションする
   */
  static validateQueryParams<T>(
    url: URL,
    schema: z.ZodSchema<T>
  ):
    | { success: true; data: T }
    | {
        success: false;
        errors: Array<{ field: string; message: string; value?: unknown }>;
      } {
    const params = Object.fromEntries(url.searchParams.entries());
    return validateWithZod(schema, params);
  }

  /**
   * FormDataをバリデーションする
   */
  static async validateFormData<T>(
    request: Request,
    schema: z.ZodSchema<T>
  ): Promise<
    | { success: true; data: T }
    | {
        success: false;
        errors: Array<{ field: string; message: string; value?: unknown }>;
      }
  > {
    try {
      const formData = await request.formData();
      const data = Object.fromEntries(formData.entries());
      return validateWithZod(schema, data);
    } catch {
      return {
        success: false,
        errors: [{ field: 'formData', message: 'Invalid form data format' }],
      };
    }
  }

  /**
   * 環境変数をバリデーションする
   */
  static validateEnv<T>(
    schema: z.ZodSchema<T>,
    env: Record<string, string | undefined> = process.env
  ): T {
    const result = schema.safeParse(env);

    if (!result.success) {
      const errors = formatZodError(result.error);
      const errorMessage = errors
        .map((err) => `${err.field}: ${err.message}`)
        .join(', ');
      throw new Error(`Environment validation failed: ${errorMessage}`);
    }

    return result.data;
  }
}
