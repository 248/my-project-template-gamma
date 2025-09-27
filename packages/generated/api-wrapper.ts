/**
 * 生成されたAPIクライアントのラッパー
 * 認証、エラーハンドリング、ログ出力などの共通処理を提供
 */

import * as apiClient from './api-client';
import { ApiError } from './api-mutator';

/**
 * APIクライアントの設定
 */
export interface ApiClientConfig {
  baseUrl?: string;
  credentials?: RequestCredentials;
  headers?: Record<string, string>;
  onError?: (error: ApiError) => void;
  onRequest?: (url: string, options: RequestInit) => void;
  onResponse?: (response: Response) => void;
}

/**
 * デフォルト設定
 */
const defaultConfig: ApiClientConfig = {
  baseUrl:
    typeof window !== 'undefined'
      ? window.location.origin
      : 'http://localhost:3000',
  credentials: 'include', // 認証クッキーを自動で含める
  headers: {
    'Content-Type': 'application/json',
  },
  onError: (error) => {
    if (process.env.NODE_ENV === 'development') {
      console.error('[API Error]', error);
    }
  },
  onRequest: (url, options) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[API Request] ${options.method || 'GET'} ${url}`, options);
    }
  },
  onResponse: (response) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[API Response] ${response.status} ${response.statusText}`);
    }
  },
};

let currentConfig: ApiClientConfig = { ...defaultConfig };

/**
 * APIクライアントの設定を更新
 */
export function configureApiClient(config: Partial<ApiClientConfig>) {
  currentConfig = { ...currentConfig, ...config };
}

/**
 * 現在の設定を取得
 */
export function getApiClientConfig(): ApiClientConfig {
  return { ...currentConfig };
}

/**
 * エラーハンドリング付きのAPIクライアント関数群
 */

// ヘルスチェック関連
export async function getLiveness(options?: RequestInit) {
  try {
    const result = await apiClient.getLiveness(options);
    currentConfig.onResponse?.(new Response());
    return result;
  } catch (error) {
    const apiError =
      error instanceof Error
        ? new ApiError(0, 'Network Error', null, error.message)
        : new ApiError(0, 'Unknown Error', null, 'Unknown error occurred');
    currentConfig.onError?.(apiError);
    throw apiError;
  }
}

export async function getReadiness(options?: RequestInit) {
  try {
    const result = await apiClient.getReadiness(options);
    currentConfig.onResponse?.(new Response());
    return result;
  } catch (error) {
    const apiError =
      error instanceof Error
        ? new ApiError(0, 'Network Error', null, error.message)
        : new ApiError(0, 'Unknown Error', null, 'Unknown error occurred');
    currentConfig.onError?.(apiError);
    throw apiError;
  }
}

export async function getDiagnostics(options?: RequestInit) {
  try {
    const result = await apiClient.getDiagnostics(options);
    currentConfig.onResponse?.(new Response());
    return result;
  } catch (error) {
    const apiError =
      error instanceof Error
        ? new ApiError(0, 'Network Error', null, error.message)
        : new ApiError(0, 'Unknown Error', null, 'Unknown error occurred');
    currentConfig.onError?.(apiError);
    throw apiError;
  }
}

// 画像管理関連
export async function listImages(
  params?: apiClient.ListImagesParams,
  options?: RequestInit
) {
  try {
    const result = await apiClient.listImages(params, options);
    currentConfig.onResponse?.(new Response());
    return result;
  } catch (error) {
    const apiError =
      error instanceof Error
        ? new ApiError(0, 'Network Error', null, error.message)
        : new ApiError(0, 'Unknown Error', null, 'Unknown error occurred');
    currentConfig.onError?.(apiError);
    throw apiError;
  }
}

export async function uploadImage(
  uploadImageBody: apiClient.UploadImageBody,
  options?: RequestInit
) {
  try {
    const result = await apiClient.uploadImage(uploadImageBody, options);
    currentConfig.onResponse?.(new Response());
    return result;
  } catch (error) {
    const apiError =
      error instanceof Error
        ? new ApiError(0, 'Network Error', null, error.message)
        : new ApiError(0, 'Unknown Error', null, 'Unknown error occurred');
    currentConfig.onError?.(apiError);
    throw apiError;
  }
}

export async function deleteImage(imageId: string, options?: RequestInit) {
  try {
    const result = await apiClient.deleteImage(imageId, options);
    currentConfig.onResponse?.(new Response());
    return result;
  } catch (error) {
    const apiError =
      error instanceof Error
        ? new ApiError(0, 'Network Error', null, error.message)
        : new ApiError(0, 'Unknown Error', null, 'Unknown error occurred');
    currentConfig.onError?.(apiError);
    throw apiError;
  }
}

// 型の再エクスポート
export type {
  LivenessResponse,
  ReadinessResponse,
  DiagnosticsResponse,
  ImageResponse,
  ImageListResponse,
  ErrorResponse,
  HealthCheck,
  Pagination,
  ListImagesParams,
  UploadImageBody,
} from './api-client';

// 生成されたクライアント関数も直接エクスポート（必要に応じて）
export * as rawApiClient from './api-client';
