# Template Gamma

Next.js 15.5.2 + React 19.0.0 を使用し、OpenNext で Cloudflare Workers 上に展開される Web アプリケーション開発用のプロジェクトテンプレートです。

## 🚀 主要機能

- **型安全な開発**: OpenAPI-First による契約駆動開発
- **認証システム**: Supabase Auth による OAuth 認証
- **画像管理**: アップロード・一覧表示・削除機能
- **ヘルスチェック**: Liveness・Readiness・Diagnostics
- **観測性**: 構造化ログと分散トレーシング
- **2モード対応**: Monolith・Service の切替可能
- **包括的テスト**: 単体・統合・E2E テスト

## 🏗️ 技術スタック

### フロントエンド

- **Next.js 15.5.2** (App Router)
- **React 19.0.0**
- **TypeScript**
- **Tailwind CSS**
- **Zod** (バリデーション)

### バックエンド

- **Cloudflare Workers** (OpenNext)
- **Supabase** (Auth + Postgres + Storage)
- **Pino** (構造化ログ)
- **Sentry** (エラートラッキング)

### 開発・テスト

- **pnpm** (パッケージマネージャー)
- **Vitest** (単体・統合テスト)
- **Playwright** (E2Eテスト)
- **MSW** (APIモック)
- **ESLint + Prettier** (コード品質)

### CI/CD

- **GitHub Actions**
- **Wrangler** (Cloudflare Workers CLI)
- **OpenAPI** (契約駆動開発)

## 🚀 クイックスタート

### 前提条件

- **Node.js 22** (LTS推奨)
- **pnpm** (corepack enable で有効化)
- **Git**

### セットアップ

```bash
# リポジトリのクローン
git clone https://github.com/your-org/template-gamma.git
cd template-gamma

# 依存関係のインストールと型生成
pnpm setup

# 環境変数の設定
copy .env.example .dev.vars
# .dev.vars を編集してSupabase設定を追加

# 開発サーバーの起動
pnpm dev
```

ブラウザで http://localhost:3000 を開いて動作確認してください。

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

## 📚 ドキュメント

詳細なドキュメントは `docs/` ディレクトリにあります：

- **[アーキテクチャ設計書](docs/architecture.md)**: システム全体の設計と構成
- **[開発環境セットアップ](docs/development.md)**: 開発環境の構築手順
- **[API仕様書](docs/api.md)**: OpenAPI契約とエラーハンドリング
- **[テスト戦略書](docs/testing.md)**: 単体・統合・E2Eテストの戦略
- **[CI/CDパイプライン](docs/ci-cd.md)**: GitHub Actionsとデプロイフロー
- **[デプロイメントガイド](docs/deployment.md)**: OpenNextとCloudflare Workers

## 🔧 開発ワークフロー

### 日常的な開発

```bash
# 新機能の開発開始
git checkout -b feature/new-feature
pnpm dev

# コード品質チェック
pnpm lint:fix
pnpm format
pnpm type-check

# テスト実行
pnpm test:unit
pnpm test:integration

# OpenAPI契約チェック
pnpm openapi:check
```

### デプロイ

```bash
# OpenNextビルド（Linux環境）
pnpm build
pnpm opennext:build

# ローカルプレビュー
pnpm opennext:preview

# 本番デプロイ
wrangler deploy
```

## 🧪 テスト

### テスト実行

```bash
# 全テスト実行
pnpm test:all

# 単体テスト
pnpm test:unit

# 統合テスト
pnpm test:integration

# E2Eテスト
pnpm test:e2e

# バックエンドモード別テスト
pnpm test:mode
```

### テスト戦略

- **単体テスト**: Core・BFF・Adapters層の純粋関数
- **統合テスト**: APIエンドポイントとバリデーション
- **E2Eテスト**: ユーザーフロー（Top→Login→Home→Logout）

## 🏛️ アーキテクチャ

### 層構成

```
apps/web (Next.js)
    ↓
packages/bff (Business Facade)
    ↓
packages/core (Domain Logic)
    ↓
packages/adapters (External I/O)
```

### 2モード対応

- **Monolith Mode**: 単一デプロイメント（開発・初期運用）
- **Service Mode**: フロントエンド・バックエンド分離（スケール時）

環境変数 `BACKEND_MODE=monolith|service` で切替可能

## 🔐 セキュリティ

- **認証**: Supabase Auth (OAuth)
- **認可**: Row Level Security (RLS)
- **セッション**: HttpOnly Cookie
- **バリデーション**: Zod スキーマ
- **PII保護**: ログマスキング

## 📊 監視・観測性

- **ログ**: Pino による構造化ログ
- **エラー**: Sentry による追跡
- **トレース**: W3C TraceContext 準拠
- **メトリクス**: Cloudflare Analytics

## 🚨 注意事項

- `packages/generated/` 内のファイルは自動生成のため直接編集禁止
- 開発開始前に必ず `pnpm setup` を実行
- OpenAPI仕様書変更時は `pnpm openapi:generate` を実行
- E2Eテスト実行前に開発サーバーの起動を確認
- Windows環境では `npx playwright install` でブラウザをインストール

## 🤝 コントリビューション

1. Issueを作成して機能要求やバグ報告
2. フィーチャーブランチを作成
3. テストを追加・実行
4. `develop`ブランチ向けのプルリクエストを作成
5. コードレビューを受ける

## 📄 ライセンス

MIT License - 詳細は [LICENSE](LICENSE) ファイルを参照
