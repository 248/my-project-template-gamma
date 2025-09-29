# Template Gamma

Next.js 15.5.2 + React 19.0.0 template for Cloudflare Workers with OpenNext

## セットアップ

```bash
# 依存関係のインストールと型生成
pnpm setup

# 開発サーバーの起動
pnpm dev
```

## 開発

### 型生成

このプロジェクトでは、OpenAPI仕様書から TypeScript の型定義とAPIクライアントを自動生成しています。

```bash
# OpenAPI仕様書から型とクライアントを生成
pnpm openapi:generate

# OpenAPI仕様書のLint
pnpm openapi:lint
```

### スクリプト

```bash
# 開発
pnpm dev              # 開発サーバー起動
pnpm build            # プロダクションビルド
pnpm start            # プロダクションサーバー起動

# コード品質
pnpm lint             # ESLint実行
pnpm lint:fix         # ESLint自動修正
pnpm format           # Prettier実行
pnpm format:check     # Prettierチェック
pnpm type-check       # TypeScript型チェック

# テスト
pnpm test             # 全テスト実行（単体・統合）
pnpm test:watch       # テスト監視モード
pnpm test:ui          # テストUI
pnpm test:unit        # 単体テスト実行
pnpm test:integration # 統合テスト実行
pnpm test:e2e         # E2Eテスト実行
pnpm test:e2e:ui      # E2EテストUI
pnpm test:all         # 全テスト実行（単体・統合・E2E）
pnpm test:mode        # バックエンドモード別テスト
pnpm test:mode:monolith  # モノリスモードテスト
pnpm test:mode:service   # サービスモードテスト

# OpenAPI
pnpm openapi:generate # 型とクライアント生成
pnpm openapi:lint     # OpenAPI仕様書Lint
pnpm openapi:check    # 生成物同期チェック

# OpenNext / Cloudflare Workers
pnpm opennext:build   # OpenNext Cloudflareビルド
pnpm opennext:preview # ローカルWorkersプレビュー
pnpm opennext:deploy:dry # デプロイドライラン

# その他
pnpm clean            # クリーンアップ
pnpm setup            # 初回セットアップ
```

## プロジェクト構成

```
├── apps/
│   └── web/                 # Next.js アプリケーション
├── packages/
│   ├── adapters/           # 外部サービスアダプター
│   ├── bff/                # BFF層
│   ├── contracts/          # 共通契約・エラーコード
│   ├── core/               # コアドメインロジック
│   └── generated/          # 自動生成ファイル（Git管理外）
├── openapi/
│   └── openapi.yaml        # OpenAPI仕様書
├── orval.config.ts         # Orval設定
└── package.json
```

## テスト

このプロジェクトでは、3層のテスト戦略を採用しています：

### 単体テスト（Vitest）

```bash
pnpm test:unit        # 単体テスト実行
pnpm test:watch       # 監視モード
pnpm test:ui          # テストUI
```

- **Core層**: 純粋関数とビジネスロジックのテスト
- **BFF層**: サービス層のテスト（モック使用）
- **Adapters層**: アダプターのテスト

### 統合テスト（MSW）

```bash
pnpm test:integration # 統合テスト実行
```

- APIエンドポイントの統合テスト
- バリデーションエラーハンドリングのテスト
- 認証・認可のテスト

### E2Eテスト（Playwright）

```bash
pnpm test:e2e         # E2Eテスト実行
pnpm test:e2e:ui      # PlaywrightテストUI
```

- ユーザーフローのテスト（Top→Login→Home→Logout）
- ヘルスチェック画面のテスト
- 画像管理機能のテスト

### バックエンドモード別テスト

```bash
pnpm test:mode        # 両モードでテスト実行
pnpm test:mode:monolith  # モノリスモードのみ
pnpm test:mode:service   # サービスモードのみ
```

### 全テスト実行

```bash
pnpm test:all         # 単体・統合・E2E全て実行
```

## OpenNext / Cloudflare Workers

### ローカル開発

```bash
pnpm opennext:build   # Next.js + OpenNext ビルド
pnpm opennext:preview # Wrangler でローカルプレビュー
```

### デプロイ

```bash
pnpm opennext:deploy:dry  # デプロイのドライラン（設定検証）
```

### CI/CD

GitHub Actionsで以下を自動実行：

- OpenNextビルドの検証
- Wrangler設定の検証
- バックエンドモード別テスト

## 注意事項

- `packages/generated/` 内の `api-types.ts`、`api-client.ts`、`api-client.schemas.ts` は自動生成ファイルのため、直接編集しないでください
- 開発開始前に必ず `pnpm setup` を実行してください
- OpenAPI仕様書を変更した場合は `pnpm openapi:generate` を実行してください
- E2Eテストを実行する前に、開発サーバーが起動していることを確認してください
- Windows環境では、Playwrightブラウザのインストールが必要な場合があります：`npx playwright install`
