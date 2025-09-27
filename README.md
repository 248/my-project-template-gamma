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
pnpm test             # テスト実行
pnpm test:watch       # テスト監視モード
pnpm test:ui          # テストUI

# OpenAPI
pnpm openapi:generate # 型とクライアント生成
pnpm openapi:lint     # OpenAPI仕様書Lint
pnpm openapi:check    # 生成物同期チェック

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

## 注意事項

- `packages/generated/` 内の `api-types.ts`、`api-client.ts`、`api-client.schemas.ts` は自動生成ファイルのため、直接編集しないでください
- 開発開始前に必ず `pnpm setup` を実行してください
- OpenAPI仕様書を変更した場合は `pnpm openapi:generate` を実行してください
