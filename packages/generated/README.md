# Generated API Types and Client

このパッケージには、OpenAPI仕様書から自動生成されたTypeScript型定義とAPIクライアントが含まれています。

## 生成されるファイル

- `api-types.ts` - OpenAPI仕様書から生成された型定義（openapi-typescript）
- `api-client.ts` - APIクライアント関数（orval）
- `api-client.schemas.ts` - APIクライアントのスキーマ定義（orval）
- `api-mutator.ts` - カスタムfetch実装（エラーハンドリング、ログ出力）
- `api-wrapper.ts` - APIクライアントのラッパー（推奨）

## 使用方法

### 基本的な使用方法（推奨）

```typescript
import {
  getLiveness,
  getReadiness,
  getDiagnostics,
  listImages,
  uploadImage,
  deleteImage,
  configureApiClient,
  type LivenessResponse,
  type ImageResponse,
} from '@template-gamma/generated/api-wrapper';

// APIクライアントの設定（オプション）
configureApiClient({
  baseUrl: 'https://your-api-domain.com',
  onError: (error) => {
    console.error('API Error:', error);
    // Sentryなどにエラーを送信
  },
});

// ヘルスチェック
const health = await getLiveness();
console.log(health.data.status); // 'ok'

// 画像一覧取得
const images = await listImages({ page: 1, limit: 20 });
console.log(images.data.images);

// 画像アップロード
const file = new File(['...'], 'image.jpg', { type: 'image/jpeg' });
const uploadResult = await uploadImage({ file });
console.log(uploadResult.data.id);
```

### 型定義のみを使用

```typescript
import type {
  LivenessResponse,
  ReadinessResponse,
  ImageResponse,
  ErrorResponse,
} from '@template-gamma/generated/api-types';

// 型として使用
const response: LivenessResponse = {
  status: 'ok',
  timestamp: new Date().toISOString(),
};
```

### 生のAPIクライアントを使用

```typescript
import {
  getLiveness,
  getReadiness,
} from '@template-gamma/generated/api-client';

// 直接APIクライアントを使用（エラーハンドリングなし）
const result = await getLiveness();
```

## セットアップ

初回セットアップ時は、以下のコマンドで依存関係のインストールと型生成を実行してください：

```bash
# 初回セットアップ（依存関係インストール + 型生成）
pnpm setup
```

## 型生成の更新

OpenAPI仕様書を更新した後は、以下のコマンドで型とクライアントを再生成してください：

```bash
# 型とクライアントの生成
pnpm openapi:generate

# OpenAPI仕様書のLint
pnpm openapi:lint

# 生成物の同期チェック（CI用）
pnpm openapi:check
```

**注意**: `api-types.ts`、`api-client.ts`、`api-client.schemas.ts`は自動生成ファイルのため、Gitで管理されていません。開発開始前に必ず`pnpm setup`または`pnpm openapi:generate`を実行してください。

## 設定

### Orval設定（orval.config.ts）

```typescript
import { defineConfig } from 'orval';

export default defineConfig({
  'template-gamma-api': {
    input: {
      target: './openapi/openapi.yaml',
    },
    output: {
      target: './packages/generated/api-client.ts',
      client: 'fetch',
      mode: 'single',
      httpClient: 'fetch',
      prettier: true,
      baseUrl: 'http://localhost:3000',
    },
  },
});
```

### APIクライアント設定

```typescript
import { configureApiClient } from '@template-gamma/generated/api-wrapper';

configureApiClient({
  baseUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000',
  credentials: 'include', // 認証クッキーを含める
  headers: {
    'Content-Type': 'application/json',
  },
  onError: (error) => {
    // エラーハンドリング
    console.error('API Error:', error);
  },
  onRequest: (url, options) => {
    // リクエストログ
    console.log(`API Request: ${options.method} ${url}`);
  },
  onResponse: (response) => {
    // レスポンスログ
    console.log(`API Response: ${response.status}`);
  },
});
```

## エラーハンドリング

APIクライアントは統一されたエラーハンドリングを提供します：

```typescript
import { ApiError } from '@template-gamma/generated/api-mutator';

try {
  const result = await getDiagnostics();
} catch (error) {
  if (error instanceof ApiError) {
    console.error('API Error:', {
      status: error.status,
      statusText: error.statusText,
      data: error.data,
    });

    // ステータスコードに応じた処理
    if (error.status === 401) {
      // 認証エラー - ログインページにリダイレクト
    } else if (error.status === 403) {
      // 認可エラー - アクセス拒否メッセージ
    }
  }
}
```

## 開発時の注意事項

1. **自動生成ファイルの編集禁止**: `api-types.ts`、`api-client.ts`、`api-client.schemas.ts`は自動生成されるため、直接編集しないでください。

2. **型安全性**: 生成された型を使用することで、フロントエンドとバックエンド間のAPI契約が保証されます。

3. **認証**: `api-wrapper.ts`を使用することで、認証クッキーが自動的に含まれます。

4. **エラーハンドリング**: `api-wrapper.ts`を使用することで、統一されたエラーハンドリングが適用されます。
