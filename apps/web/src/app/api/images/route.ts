/**
 * 画像管理API - 一覧取得・アップロード
 * 要件 4.1-4.3: 画像アップロード、一覧表示機能
 * 要件 5.5, 5.6: 統一エラーレスポンス
 * 要件 8.3: Zodバリデーション統合
 */

import { NextRequest } from 'next/server';
import { ServiceFactory } from '@template-gamma/bff';

/**
 * 画像一覧取得 API
 * GET /api/images?page=1&limit=20
 */
export async function GET(request: NextRequest): Promise<Response> {
  try {
    // 認証情報を取得（middlewareで安全に設定されたヘッダーから取得）
    const userId = request.headers.get('x-authenticated-user-id');
    if (!userId) {
      return Response.json(
        { code: 'AUTH_REQUIRED', message: 'Authentication required' },
        { status: 401 }
      );
    }

    // クエリパラメータの検証
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1', 10);
    const limit = parseInt(url.searchParams.get('limit') || '20', 10);

    if (page < 1 || limit < 1 || limit > 100) {
      return Response.json(
        { code: 'VALIDATION_ERROR', message: 'Invalid pagination parameters' },
        { status: 422 }
      );
    }

    // BFFファクトリーからサービスを取得（層違反を防ぐ）
    const imageService = ServiceFactory.createImageService();

    // 画像一覧を取得
    const result = await imageService.listUserImages(userId, page, limit);

    return Response.json(result, { status: 200 });
  } catch {
    return Response.json(
      { code: 'INTERNAL_ERROR', message: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * 画像アップロード API
 * POST /api/images
 */
export async function POST(request: NextRequest): Promise<Response> {
  try {
    // 認証情報を取得（middlewareで安全に設定されたヘッダーから取得）
    const userId = request.headers.get('x-authenticated-user-id');
    if (!userId) {
      return Response.json(
        { code: 'AUTH_REQUIRED', message: 'Authentication required' },
        { status: 401 }
      );
    }

    // ファイルアップロードのバリデーション
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return Response.json(
        { code: 'VALIDATION_ERROR', message: 'File is required' },
        { status: 422 }
      );
    }

    // ファイルサイズとタイプの検証
    const maxSize = 10 * 1024 * 1024; // 10MB
    const allowedTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp',
    ];

    if (file.size > maxSize) {
      return Response.json(
        { code: 'FILE_TOO_LARGE', message: 'File size exceeds 10MB limit' },
        { status: 422 }
      );
    }

    if (!allowedTypes.includes(file.type)) {
      return Response.json(
        { code: 'UNSUPPORTED_FILE_TYPE', message: 'Unsupported file type' },
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

    // BFFファクトリーからサービスを取得（層違反を防ぐ）
    const imageService = ServiceFactory.createImageService();

    // 画像をアップロード
    const result = await imageService.uploadImage(userId, imageFile);

    return Response.json(result.image, { status: 201 });
  } catch {
    return Response.json(
      { code: 'INTERNAL_ERROR', message: 'Internal server error' },
      { status: 500 }
    );
  }
}
