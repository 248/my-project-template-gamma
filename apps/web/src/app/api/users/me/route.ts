/**
 * 現在のユーザー情報API
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

// レスポンススキーマ
const UserResponseSchema = z.object({
  id: z.string().uuid(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  lastLoginAt: z.string().datetime(),
});

/**
 * 現在のユーザー情報を取得
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

    // BFFファクトリーからサービスを取得（層違反を防ぐ）
    const userService = ServiceFactory.createUserService();

    // ユーザー情報を取得または作成
    const user = await userService.createOrGetUser(userId);

    // レスポンス形式に変換
    const response = {
      id: user.id,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
      lastLoginAt: user.lastLoginAt.toISOString(),
    };

    // バリデーション
    const validatedResponse = UserResponseSchema.parse(response);

    return NextResponse.json(validatedResponse);
  } catch (error) {
    if (error instanceof BffValidationError) {
      return createErrorResponse('VALIDATION_ERROR', error.message);
    }

    return createErrorResponse('INTERNAL_ERROR', 'Internal server error');
  }
}

/**
 * 現在のユーザーの最終ログイン時刻を更新
 */
export async function PATCH(request: NextRequest) {
  try {
    // 認証情報を取得（middlewareで安全に設定されたヘッダーから取得）
    const userId = request.headers.get('x-authenticated-user-id');
    if (!userId) {
      return NextResponse.json(
        { code: 'AUTH_REQUIRED', message: 'Authentication required' },
        { status: 401 }
      );
    }

    // BFFファクトリーからサービスを取得（層違反を防ぐ）
    const userService = ServiceFactory.createUserService();

    // 最終ログイン時刻を更新
    await userService.updateLastLogin(userId);

    // 更新後のユーザー情報を取得
    const user = await userService.getUserById(userId);
    if (!user) {
      return NextResponse.json(
        { code: 'RESOURCE_NOT_FOUND', message: 'User not found' },
        { status: 404 }
      );
    }

    // レスポンス形式に変換
    const response = {
      id: user.id,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
      lastLoginAt: user.lastLoginAt.toISOString(),
    };

    // バリデーション
    const validatedResponse = UserResponseSchema.parse(response);

    return NextResponse.json(validatedResponse);
  } catch (error) {
    if (error instanceof BffValidationError) {
      return createErrorResponse('VALIDATION_ERROR', error.message);
    }

    return createErrorResponse('INTERNAL_ERROR', 'Internal server error');
  }
}
