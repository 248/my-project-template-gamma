/**
 * 画像管理API - 個別画像操作
 * 要件 4.4: 画像削除機能
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { ImageServiceFactory } from '@template-gamma/bff/images';
import {
  createSupabaseAdapter,
  createStorageAdapter,
  createLogger,
} from '@template-gamma/adapters';
import { ApiErrorHandler } from '@template-gamma/bff/error-handler';
import { ERROR_CODES } from '@template-gamma/contracts/error-codes';

// 環境変数の検証スキーマ
const envSchema = z.object({
  BACKEND_MODE: z.enum(['monolith', 'service']).default('monolith'),
  SUPABASE_URL: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
});

// パスパラメータの検証スキーマ
const paramsSchema = z.object({
  imageId: z.string().uuid('Invalid image ID format'),
});

/**
 * 画像削除 API
 * DELETE /api/images/[imageId]
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { imageId: string } }
) {
  const logger = createLogger();

  try {
    // 環境変数の検証
    const env = envSchema.parse(process.env);

    // パスパラメータの検証
    const { imageId } = paramsSchema.parse(params);

    // 認証情報を取得（middlewareで安全に設定されたヘッダーから取得）
    const userId = request.headers.get('x-authenticated-user-id');
    if (!userId) {
      return NextResponse.json(
        { code: ERROR_CODES.AUTH_REQUIRED, message: 'Authentication required' },
        { status: 401 }
      );
    }

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

    // 画像を削除
    await imageService.deleteImage(userId, imageId);

    logger.info({ userId, imageId }, 'Image deleted successfully');

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    logger.error(
      { err: error, imageId: params.imageId },
      'Failed to delete image'
    );
    return ApiErrorHandler.handle(error);
  }
}

/**
 * 画像取得 API
 * GET /api/images/[imageId]
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { imageId: string } }
) {
  const logger = createLogger();

  try {
    // 環境変数の検証
    const env = envSchema.parse(process.env);

    // パスパラメータの検証
    const { imageId } = paramsSchema.parse(params);

    // 認証情報を取得（middlewareで安全に設定されたヘッダーから取得）
    const userId = request.headers.get('x-authenticated-user-id');
    if (!userId) {
      return NextResponse.json(
        { code: ERROR_CODES.AUTH_REQUIRED, message: 'Authentication required' },
        { status: 401 }
      );
    }

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

    // 画像情報を取得
    const image = await imageService.getImage(userId, imageId);

    logger.info({ userId, imageId }, 'Image retrieved successfully');

    return NextResponse.json(image, { status: 200 });
  } catch (error) {
    logger.error(
      { err: error, imageId: params.imageId },
      'Failed to get image'
    );
    return ApiErrorHandler.handle(error);
  }
}
