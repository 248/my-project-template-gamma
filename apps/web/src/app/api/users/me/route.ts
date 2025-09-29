/**
 * 現在のユーザー情報API
 * 要件 10.1-10.4: ユーザー情報の永続化
 * 要件 6.4: 認証済みユーザーのみ許可
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { UserServiceFactory } from '@template-gamma/bff/user';
import { SupabaseAdapterFactory } from '@template-gamma/adapters/supabase';
import { LoggerFactory } from '@template-gamma/adapters/logger';
import { createErrorResponse, ValidationError } from '@template-gamma/bff';

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
    const logger = LoggerFactory.create({
      level: 'info',
      service: 'template-gamma',
      env: process.env.NODE_ENV || 'development',
      version: process.env.APP_VERSION || '1.0.0',
      pretty: process.env.NODE_ENV === 'development',
    });

    // 認証情報を取得（middlewareで設定される想定）
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json(
        { code: 'AUTH_REQUIRED', message: 'Authentication required' },
        { status: 401 }
      );
    }

    logger.info({ userId }, 'Getting current user info');

    // サービス初期化（テスト環境ではモックを使用）
    const supabaseAdapter = SupabaseAdapterFactory.create(process.env);
    const userService = UserServiceFactory.create(supabaseAdapter, logger);

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

    logger.info({ userId }, 'User info retrieved successfully');

    return NextResponse.json(validatedResponse);
  } catch (error) {
    const errorLogger = LoggerFactory.create({
      level: 'error',
      service: 'template-gamma',
      env: process.env.NODE_ENV || 'development',
      version: process.env.APP_VERSION || '1.0.0',
      pretty: process.env.NODE_ENV === 'development',
    });

    errorLogger.error({ err: error }, 'Failed to get current user');

    if (error instanceof ValidationError) {
      return createErrorResponse(error.code, error.message, error.details);
    }

    return createErrorResponse('INTERNAL_ERROR', 'Internal server error');
  }
}

/**
 * 現在のユーザーの最終ログイン時刻を更新
 */
export async function PATCH(request: NextRequest) {
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

    logger.info({ userId }, 'Updating user last login');

    // サービス初期化（テスト環境ではモックを使用）
    const supabaseAdapter = SupabaseAdapterFactory.create(process.env);
    const userService = UserServiceFactory.create(supabaseAdapter, logger);

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

    logger.info({ userId }, 'User last login updated successfully');

    return NextResponse.json(validatedResponse);
  } catch (error) {
    const errorLogger = LoggerFactory.create({
      level: 'error',
      service: 'template-gamma',
      env: process.env.NODE_ENV || 'development',
      version: process.env.APP_VERSION || '1.0.0',
      pretty: process.env.NODE_ENV === 'development',
    });

    errorLogger.error({ err: error }, 'Failed to update user last login');

    if (error instanceof ValidationError) {
      return createErrorResponse(error.code, error.message, error.details);
    }

    return createErrorResponse('INTERNAL_ERROR', 'Internal server error');
  }
}
