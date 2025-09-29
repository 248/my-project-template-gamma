/**
 * 画像URL取得API
 * 要件 11.2: 署名付き URL で本人のみに可視化する
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
 * 画像表示URL取得 API
 * GET /api/images/[imageId]/url
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

    // 認証チェック（簡易版 - 実際の実装では middleware で処理）
    const userId = request.headers.get('x-user-id');
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

    // 画像表示URLを取得
    const imageUrl = await imageService.getImageUrl(userId, imageId);

    logger.info({ userId, imageId }, 'Image URL generated successfully');

    return NextResponse.json({ url: imageUrl }, { status: 200 });
  } catch (error) {
    logger.error(
      { err: error, imageId: params.imageId },
      'Failed to get image URL'
    );
    return ApiErrorHandler.handle(error);
  }
}
