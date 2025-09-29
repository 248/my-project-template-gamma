/**
 * 画像管理API - 一覧取得・アップロード
 * 要件 4.1-4.3: 画像アップロード、一覧表示機能
 * 要件 5.5, 5.6: 統一エラーレスポンス
 * 要件 8.3: Zodバリデーション統合
 */

import { NextRequest } from 'next/server';
import { ImageServiceFactory } from '@template-gamma/bff/images';
import {
  createSupabaseAdapter,
  createStorageAdapter,
  createLogger,
} from '@template-gamma/adapters';
import { withAuthAndErrorHandling } from '@template-gamma/bff/middleware/error-middleware';
import { ValidationErrorHandlerFactory } from '@template-gamma/bff/validation/validation-error-handler';
import {
  CommonSchemas,
  EnvSchemas,
} from '@template-gamma/contracts/validation-schemas';

/**
 * 画像一覧取得 API
 * GET /api/images?page=1&limit=20
 */
const getHandler = async (request: NextRequest): Promise<Response> => {
  const logger = createLogger();
  const validator = ValidationErrorHandlerFactory.create(logger);

  console.log('GET /api/images - Starting request');

  // 環境変数の検証
  const env = validator.validateEnv(EnvSchemas.base.merge(EnvSchemas.supabase));
  console.log('Environment parsed successfully');

  // 認証情報を取得（withAuthAndErrorHandlingで既にチェック済み）
  const userId = request.headers.get('x-user-id')!;

  // クエリパラメータの検証
  const url = new URL(request.url);
  const queryParams = validator.validateQueryParams(
    url,
    CommonSchemas.pagination
  );

  // サービス依存関係の作成
  console.log('Creating adapters...');
  const supabaseAdapter = createSupabaseAdapter({
    url: env.SUPABASE_URL || 'mock://supabase',
    serviceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY || 'mock-key',
  });
  console.log('Supabase adapter created');

  const storageAdapter = createStorageAdapter({
    type: 'mock', // Windows環境ではモック版を使用
  });
  console.log('Storage adapter created');

  const imageService = ImageServiceFactory.create(
    supabaseAdapter,
    storageAdapter,
    logger
  );
  console.log('Image service created');

  // 画像一覧を取得
  const result = await imageService.listUserImages(
    userId,
    queryParams.page,
    queryParams.limit
  );

  logger.info(
    {
      userId,
      page: queryParams.page,
      limit: queryParams.limit,
      total: result.pagination.total,
    },
    'Images listed successfully'
  );

  return Response.json(result, { status: 200 });
};

export const GET = withAuthAndErrorHandling(getHandler, {
  logger: createLogger(),
  includeStackTrace: process.env.NODE_ENV === 'development',
});

/**
 * 画像アップロード API
 * POST /api/images
 */
const postHandler = async (request: NextRequest): Promise<Response> => {
  const logger = createLogger();
  const validator = ValidationErrorHandlerFactory.create(logger);

  console.log('POST /api/images - Starting request');

  // 環境変数の検証
  const env = validator.validateEnv(EnvSchemas.base.merge(EnvSchemas.supabase));
  console.log('Environment parsed successfully');

  // 認証情報を取得（withAuthAndErrorHandlingで既にチェック済み）
  const userId = request.headers.get('x-user-id')!;

  // ファイルアップロードのバリデーション
  const file = await validator.validateFileUpload(request, {
    maxSize: 10 * 1024 * 1024, // 10MB
    allowedTypes: [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp',
    ],
    required: true,
  });

  // ファイル情報の準備
  const imageFile = {
    filename: file!.name,
    size: file!.size,
    mimeType: file!.type,
    buffer: await file!.arrayBuffer(),
  };

  // サービス依存関係の作成
  const supabaseAdapter = createSupabaseAdapter({
    url: env.SUPABASE_URL || 'mock://supabase',
    serviceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY || 'mock-key',
  });

  const storageAdapter = createStorageAdapter({
    type: 'mock', // Windows環境ではモック版を使用
  });

  const imageService = ImageServiceFactory.create(
    supabaseAdapter,
    storageAdapter,
    logger
  );

  // 画像をアップロード
  const result = await imageService.uploadImage(userId, imageFile);

  logger.info(
    {
      userId,
      imageId: result.image.id,
      filename: result.image.filename,
      size: result.image.fileSize,
    },
    'Image uploaded successfully'
  );

  return Response.json(result.image, { status: 201 });
};

export const POST = withAuthAndErrorHandling(postHandler, {
  logger: createLogger(),
  includeStackTrace: process.env.NODE_ENV === 'development',
});
