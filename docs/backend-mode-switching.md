# バックエンドモード切替機能

## 概要

Template Gamma では、`BACKEND_MODE` 環境変数を使用して、monolith モードと service モードを切り替えることができます。この機能により、将来のマイクロサービス化に向けた段階的な移行が可能になります。

## モードの種類

### Monolith モード（デフォルト）

- **値**: `BACKEND_MODE=monolith`
- **説明**: BFF層が直接 Adapters 層にアクセスする従来のモノリス構成
- **用途**: 開発初期段階、シンプルな構成での運用

### Service モード（将来実装）

- **値**: `BACKEND_MODE=service`
- **説明**: BFF層が外部サービスとHTTP通信する分散構成
- **用途**: マイクロサービス化後の運用
- **現在の状態**: 未実装（エラーを投げる）

## 環境変数の設定

### 優先順位

1. `BACKEND_MODE` - サーバーサイド用
2. `NEXT_PUBLIC_BACKEND_MODE` - クライアントサイド用（フォールバック）

### 設定例

```bash
# Monolith モード
BACKEND_MODE=monolith
NEXT_PUBLIC_BACKEND_MODE=monolith

# Service モード（将来）
BACKEND_MODE=service
NEXT_PUBLIC_BACKEND_MODE=service
```

## 使用方法

### コード内での利用

```typescript
import {
  getBackendMode,
  isMonolithMode,
  isServiceMode,
} from '@template-gamma/contracts/backend-mode';

// 現在のモードを取得
const mode = getBackendMode(); // 'monolith' | 'service'

// モードの判定
if (isMonolithMode()) {
  // Monolith モード固有の処理
}

if (isServiceMode()) {
  // Service モード固有の処理
}
```

### BFF層でのサービスファクトリー

```typescript
import { createServiceFactory } from '@template-gamma/bff/mode-factory';

// モードに応じたサービスファクトリーを作成
const factory = createServiceFactory();
const healthService = factory.createHealthService();
```

## 依存方向の制約

ESLint ルールにより、以下の依存方向が強制されます：

```
Web → BFF → Core
     ↓
  Adapters
```

### 制約内容

- **Core パッケージ**: 他のパッケージに依存不可
- **BFF パッケージ**: Web パッケージに依存不可
- **Adapters パッケージ**: Web, BFF パッケージに依存不可
- **Contracts パッケージ**: 他のパッケージに依存不可
- **Route Handlers**: Core, Adapters パッケージに直接依存不可（BFF層経由必須）

## テスト

### 単体テスト

```bash
# バックエンドモードのテスト
pnpm vitest run __tests__/unit/backend-mode.test.ts

# 統合テスト
pnpm vitest run __tests__/integration/backend-mode-integration.test.ts
```

### モード別テスト

```bash
# Monolith モードでテスト
BACKEND_MODE=monolith pnpm test

# Service モードでテスト
BACKEND_MODE=service pnpm test
```

### 依存方向のチェック

```bash
# ESLint による依存方向チェック
pnpm lint:deps
```

## CI/CD での検証

GitHub Actions では、両方のモードでテストが実行されます：

```yaml
strategy:
  matrix:
    backend_mode: [monolith, service]
```

## 開発時の確認

### モード情報の確認

```bash
# 現在のモードを確認
pnpm validate:mode
```

### 環境変数の設定確認

```typescript
import { checkModeEnvironment } from '../apps/web/lib/backend-mode';

console.log(checkModeEnvironment());
// {
//   BACKEND_MODE: 'monolith',
//   NEXT_PUBLIC_BACKEND_MODE: 'monolith',
//   NODE_ENV: 'development',
//   resolvedMode: 'monolith'
// }
```

## 将来の拡張

Service モードが実装される際は、以下の機能が追加されます：

1. **外部サービス通信**: HTTP クライアントによる API 呼び出し
2. **サービスディスカバリー**: 外部サービスのエンドポイント管理
3. **回復性パターン**: サーキットブレーカー、リトライ機能
4. **分散トレーシング**: マイクロサービス間のトレース連携

## トラブルシューティング

### よくある問題

1. **無効なモード値**
   - 解決策: `monolith` または `service` のみ使用可能

2. **Service モードでのエラー**
   - 現象: "Service mode not implemented yet" エラー
   - 解決策: `BACKEND_MODE=monolith` に設定

3. **依存方向違反**
   - 現象: ESLint エラー
   - 解決策: 適切な層を経由してアクセス

### デバッグ

```typescript
// 開発環境でのモード情報出力
import { logModeInfo } from '../apps/web/lib/backend-mode';
logModeInfo(); // コンソールにモード情報を出力
```
