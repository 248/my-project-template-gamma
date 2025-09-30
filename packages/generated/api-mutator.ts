/**
 * カスタムfetch関数
 * 認証クッキーの自動付与、エラーハンドリング、ログ出力などを行う
 */

export interface CustomFetchOptions extends RequestInit {
  url: string;
}

export interface CustomFetchResponse<T = any> {
  data: T;
  status: number;
  statusText: string;
  headers: Headers;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    public statusText: string,
    public data: any,
    message?: string
  ) {
    super(message || `API Error: ${status} ${statusText}`);
    this.name = 'ApiError';
  }
}

/**
 * カスタムfetch実装
 * - 認証クッキーの自動付与
 * - エラーレスポンスの統一処理
 * - リクエスト/レスポンスのログ出力（開発環境）
 */
const customFetch = async <T = any>(
  options: CustomFetchOptions
): Promise<CustomFetchResponse<T>> => {
  const { url, ...fetchOptions } = options;

  // デフォルトヘッダーの設定
  const headers = new Headers(fetchOptions.headers);

  // Content-Typeが設定されていない場合のデフォルト設定
  if (
    !headers.has('Content-Type') &&
    fetchOptions.body &&
    typeof fetchOptions.body === 'string'
  ) {
    headers.set('Content-Type', 'application/json');
  }

  // 開発環境でのリクエストログ
  if (process.env.NODE_ENV === 'development') {
    const headerObj: Record<string, string> = {};
    headers.forEach((value, key) => {
      headerObj[key] = value;
    });
    // 構造化ログでリクエストを記録
    const { clientLogger } = require('../../../apps/web/src/lib/logger');
    clientLogger.debug({
      method: fetchOptions.method || 'GET',
      url,
      headers: headerObj,
      body: fetchOptions.body,
    });
  }

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      headers,
      credentials: 'include', // 認証クッキーを自動で含める
    });

    // レスポンスボディの取得
    let data: T;
    const contentType = response.headers.get('Content-Type');

    if (contentType?.includes('application/json')) {
      data = await response.json();
    } else if (contentType?.includes('text/')) {
      data = (await response.text()) as T;
    } else {
      data = (await response.blob()) as T;
    }

    // 開発環境でのレスポンスログ
    if (process.env.NODE_ENV === 'development') {
      const responseHeaderObj: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        responseHeaderObj[key] = value;
      });

      const { clientLogger } = require('../../../apps/web/src/lib/logger');
      clientLogger.debug(
        {
          status: response.status,
          statusText: response.statusText,
          data,
          headers: responseHeaderObj,
        },
        'API Response'
      );
    }

    // エラーレスポンスの処理
    if (!response.ok) {
      throw new ApiError(
        response.status,
        response.statusText,
        data,
        `API request failed: ${response.status} ${response.statusText}`
      );
    }

    return {
      data,
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    };
  } catch (error) {
    // ネットワークエラーやその他の例外の処理
    if (error instanceof ApiError) {
      throw error;
    }

    // 開発環境でのエラーログ
    if (process.env.NODE_ENV === 'development') {
      const { clientLogger } = require('../../../apps/web/src/lib/logger');
      clientLogger.error(
        { error: error instanceof Error ? error.message : String(error), url },
        'API Network Error'
      );
    }

    throw new ApiError(
      0,
      'Network Error',
      null,
      error instanceof Error ? error.message : 'Unknown network error'
    );
  }
};

// Orval用のnamed export
export { customFetch };
