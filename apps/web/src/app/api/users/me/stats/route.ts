/**
 * 現在のユーザー統計情報API
 * 要件 10.1-10.4: ユーザー情報の永続化
 * 要件 6.4: 認証済みユーザーのみ許可
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  ServiceFactory,
  createErrorResponse,
  BffValidationError,
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
    // 認証情報を取得（middlewareで安全に設定されたヘッダーから取得）
    const userId = request.headers.get('x-authenticated-user-id');
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

    // inactiveDaysパラメータは将来の拡張用（現在は未使用）
    // const { inactiveDays } = queryResult.data;

    // BFFファクトリーからサービスを取得（層違反を防ぐ）
    const userService = ServiceFactory.createUserService();

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

    return NextResponse.json(validatedResponse);
  } catch (error) {
    if (error instanceof BffValidationError) {
      return createErrorResponse('VALIDATION_ERROR', error.message);
    }

    return createErrorResponse('INTERNAL_ERROR', 'Internal server error');
  }
}
