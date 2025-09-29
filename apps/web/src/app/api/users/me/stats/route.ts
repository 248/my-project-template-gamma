/**
 * 現在のユーザー統計情報API
 * 要件 10.1-10.4: ユーザー情報の永続化
 * 要件 6.4: 認証済みユーザーのみ許可
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { UserServiceFactory } from '@template-gamma/bff/user';
import { SupabaseAdapterFactory } from '@template-gamma/adapters/supabase';
import { LoggerFactory } from '@template-gamma/adapters/logger';
import {
  createErrorResponse,
  ValidationError,
  NotFoundError,
} from '@template-gamma/bff';

// クエリパラメータスキーマ
const QuerySchema = z.object({
  inactiveDays: z
    .string()
    .optional()
    .transform((val) => {
      if (!val) return 30;
      const parsed = parseInt(val, 10);
      return isNaN(parsed) ? 30 : parsed;
    })
    .refine((val) => val > 0 && val <= 365, {
      message: 'inactiveDays must be between 1 and 365',
    }),
});

// レスポンススキーマ
const UserStatsResponseSchema = z.object({
  ageDays: z.number().int().min(0),
  daysSinceLastLogin: z.number().int().min(0),
  isActive: z.boolean(),
});

/**
 * 現在のユーザーの統計情報を取得
 */
export async function GET(request: NextRequest) {
  try {
    const logger = LoggerFactory.create({
      level: 'info',
      service: 'template-gamma',
      env: process.env.NODE_ENV || 'development',
      version: process.env.APP_VERSION || '1.0.0',
      pretty: process.env.NODE_ENV === 'development',
    });

    // 認証情報を取得
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json(
        { code: 'AUTH_REQUIRED', message: 'Authentication required' },
        { status: 401 }
      );
    }

    // クエリパラメータを解析
    const { searchParams } = new URL(request.url);
    const queryResult = QuerySchema.safeParse({
      inactiveDays: searchParams.get('inactiveDays'),
    });

    if (!queryResult.success) {
      return NextResponse.json(
        {
          code: 'VALIDATION_ERROR',
          message: 'Invalid query parameters',
          details: queryResult.error.errors,
        },
        { status: 422 }
      );
    }

    const { inactiveDays } = queryResult.data;

    logger.info({ userId, inactiveDays }, 'Getting user stats');

    // サービス初期化（テスト環境ではモックを使用）
    const supabaseAdapter = SupabaseAdapterFactory.create(process.env);

    const userService = UserServiceFactory.create(supabaseAdapter, logger);

    // ユーザー統計情報を取得
    const stats = await userService.getUserStats(userId);

    // レスポンス形式に変換
    const response = {
      ageDays: stats.ageDays,
      daysSinceLastLogin: stats.daysSinceLastLogin,
      isActive: stats.isActive,
    };

    // バリデーション
    const validatedResponse = UserStatsResponseSchema.parse(response);

    logger.info(
      { userId, stats: validatedResponse },
      'User stats retrieved successfully'
    );

    return NextResponse.json(validatedResponse);
  } catch (error) {
    const errorLogger = LoggerFactory.create({
      level: 'error',
      service: 'template-gamma',
      env: process.env.NODE_ENV || 'development',
      version: process.env.APP_VERSION || '1.0.0',
      pretty: process.env.NODE_ENV === 'development',
    });

    errorLogger.error({ err: error }, 'Failed to get user stats');

    if (error instanceof ValidationError) {
      return createErrorResponse(error.code, error.message, error.details);
    }

    if (error instanceof NotFoundError) {
      return createErrorResponse(error.code, error.message);
    }

    return createErrorResponse('INTERNAL_ERROR', 'Internal server error');
  }
}
