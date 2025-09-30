# @template-gamma/adapters

Template Gamma プロジェクトのAdapters層実装です。外部サービス（Supabase、Storage、Logger、TraceContext）への接続を抽象化し、開発・テスト用のモック実装も提供します。

## 概要

このパッケージは以下のアダプタを提供します：

- **Supabase Adapter**: Supabase Auth と Database への接続
- **Storage Adapter**: ファイルストレージ（Supabase Storage）への接続
- **Logger Adapter**: 構造化ログ出力（開発環境・Workers環境対応）
- **TraceContext**: W3C TraceContext 実装

## 特徴

- 🔄 **環境切替**: 環境変数でモック/実際のサービスを切替可能
- 🧪 **テスト対応**: 開発・テスト用のモック実装を内蔵
- 🏗️ **Factory Pattern**: 設定に応じて適切な実装を自動選択
- 📊 **観測性**: TraceContext と構造化ログの統合
- 🔒 **セキュリティ**: 機微情報の自動マスキング

## インストール

```bash
pnpm add @template-gamma/adapters
```

## 使用方法

### 基本的な使用方法

```typescript
import {
  SupabaseFactory,
  StorageFactory,
  LoggerFactory,
  TraceContext,
} from '@template-gamma/adapters';

// 環境変数に応じてアダプタを作成
const supabaseAdapter = SupabaseFactory.create(env);
const storageAdapter = StorageFactory.create(env);
const logger = LoggerFactory.createDefault(env);

// TraceContext の使用
const traceInfo = TraceContext.parseTraceparent(request.headers.traceparent);
const childLogger = logger.child({
  requestId: TraceContext.generateRequestId(),
  traceId: traceInfo.traceId,
  spanId: traceInfo.spanId,
});
```

### 環境変数設定

#### 本番環境（実際のサービス使用）

```bash
# Supabase設定
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# ログ設定
LOG_LEVEL=info
SERVICE_NAME=template-gamma
NODE_ENV=production
APP_VERSION=1.0.0
```

#### 開発環境（モック使用）

```bash
# モック使用フラグ
USE_MOCK_SUPABASE=true
USE_MOCK_STORAGE=true

# ログ設定
LOG_LEVEL=debug
SERVICE_NAME=template-gamma
NODE_ENV=development
APP_VERSION=1.0.0
```

### 個別アダプタの使用

#### Supabase Adapter

```typescript
import { SupabaseFactory } from '@template-gamma/adapters/supabase';

const adapter = SupabaseFactory.create(env);

// ヘルスチェック
const isHealthy = await adapter.ping();

// ユーザー管理
const user = await adapter.createUser({
  id: 'user-123',
  lastLoginAt: new Date(),
});

await adapter.updateLastLogin('user-123');
const retrievedUser = await adapter.getUserById('user-123');
```

#### Storage Adapter

```typescript
import {
  StorageFactory,
  STORAGE_BUCKETS,
} from '@template-gamma/adapters/storage';

const adapter = StorageFactory.create(env);

// バケット作成
await adapter.createBucket(STORAGE_BUCKETS.USER_IMAGES);

// ファイルアップロード
const path = await adapter.uploadFile(
  STORAGE_BUCKETS.USER_IMAGES,
  'user123/image.jpg',
  fileBuffer,
  'image/jpeg'
);

// 署名付きURL生成
const signedUrl = await adapter.getSignedUrl(
  STORAGE_BUCKETS.USER_IMAGES,
  path,
  3600 // 1時間
);
```

#### Logger

```typescript
import { LoggerFactory } from '@template-gamma/adapters/logger';

const logger = LoggerFactory.createDefault(env);

// 基本ログ
logger.info('Application started');
logger.error({ err: error }, 'Error occurred');

// 子ロガー（コンテキスト付き）
const childLogger = logger.child({
  requestId: 'req-123',
  userId: 'user-456',
});

childLogger.info('User action completed');
```

#### TraceContext

```typescript
import { TraceContext } from '@template-gamma/adapters/trace-context';

// リクエストヘッダからトレース情報を解析
const traceInfo = TraceContext.parseTraceparent(request.headers.traceparent);

// 子スパンを生成
const childSpan = TraceContext.generateChildSpan(traceInfo);

// 新しいtraceparentヘッダを生成
const newTraceparent = TraceContext.generateTraceparent(childSpan);

// 外部サービス呼び出し時にヘッダに設定
fetch('/api/external', {
  headers: {
    traceparent: newTraceparent,
  },
});
```

## テスト

```bash
# 全テスト実行
pnpm test:run

# ウォッチモード
pnpm test

# カバレッジ付き
pnpm test:run --coverage
```

## モック実装

開発・テスト時には、実際の外部サービスの代わりにモック実装を使用できます：

```typescript
import {
  MockSupabaseAdapter,
  MockStorageAdapter,
} from '@template-gamma/adapters';

// テスト用のモックアダプタ
const mockSupabase = new MockSupabaseAdapter();
const mockStorage = new MockStorageAdapter();

// 意図的な失敗をシミュレート
mockSupabase.setFailPing(true);
mockStorage.setFailPing(true);
```

## 型定義

全ての主要な型は TypeScript で定義されており、型安全な開発をサポートします：

```typescript
import type {
  SupabaseAdapter,
  StorageAdapter,
  Logger,
  LogContext,
  TraceInfo,
} from '@template-gamma/adapters';
```

## 要件対応

このパッケージは以下の要件に対応しています：

- **要件 6.1**: Supabase Auth Cookie を利用したセッション管理
- **要件 7.1, 7.2**: Workers Logs 前提の構造化ログ出力
- **要件 11.1-11.5**: 画像保存の段階的方針（Supabase Storage → Cloudflare Images）
- **要件 13.1, 13.4**: W3C TraceContext 実装と観測性

## ライセンス

Private
