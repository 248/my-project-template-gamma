/**
 * 画像管理API - 一覧取得・アップロード
 * 要件 4.1-4.3: 画像アップロード、一覧表示機能
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

// クエリパラメータの検証スキーマ
const listQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
});

/**
 * 画像一覧取得 API
 * GET /api/images?page=1&limit=20
 */
export async function GET(request: NextRequest) {
  const logger = createLogger();

  try {
    console.log('GET /api/images - Starting request');

    // 環境変数の検証
    const env = envSchema.parse(process.env);
    console.log('Environment parsed successfully');

    // 認証チェック（簡易版 - 実際の実装では middleware で処理）
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json(
        { code: ERROR_CODES.AUTH_REQUIRED, message: 'Authentication required' },
        { status: 401 }
      );
    }

    // クエリパラメータの検証
    const url = new URL(request.url);
    const queryParams = listQuerySchema.parse({
      page: url.searchParams.get('page'),
      limit: url.searchParams.get('limit'),
    });

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

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    logger.error({ err: error }, 'Failed to list images');
    return ApiErrorHandler.handle(error);
  }
}

/**
 * 画像アップロード API
 * POST /api/images
 */
export async function POST(request: NextRequest) {
  const logger = createLogger();

  try {
    console.log('POST /api/images - Starting request');

    // 環境変数の検証
    const env = envSchema.parse(process.env);
    console.log('Environment parsed successfully');

    // 認証チェック（簡易版 - 実際の実装では middleware で処理）
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json(
        { code: ERROR_CODES.AUTH_REQUIRED, message: 'Authentication required' },
        { status: 401 }
      );
    }

    // FormData の取得
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        {
          code: ERROR_CODES.VALIDATION_ERROR,
          message: 'File is required',
          details: { field: 'file', message: 'File is required' },
        },
        { status: 422 }
      );
    }

    // ファイル情報の準備
    const imageFile = {
      filename: file.name,
      size: file.size,
      mimeType: file.type,
      buffer: await file.arrayBuffer(),
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

    return NextResponse.json(result.image, { status: 201 });
  } catch (error) {
    logger.error({ err: error }, 'Failed to upload image');
    return ApiErrorHandler.handle(error);
  }
}
