# Template Gamma

Next.js 15.5.2 + React 19.0.0 を使用し、OpenNext で Cloudflare Workers 上に展開される Web アプリケーション開発用のプロジェクトテンプレートです。

## 技術スタック

- **フロントエンド**: Next.js 15.5.2, React 19.0.0
- **デプロイ**: Cloudflare Workers (OpenNext)
- **パッケージマネージャー**: pnpm
- **言語**: TypeScript
- **リンター**: ESLint
- **フォーマッター**: Prettier
- **テスト**: Vitest

## 開発環境

### 必要な環境

- Node.js 22.x
- pnpm 9.x

### セットアップ

```bash
# 依存関係のインストール
pnpm install

# 開発サーバーの起動
pnpm dev

# ビルド
pnpm build

# テスト実行
pnpm test

# リント実行
pnpm lint

# フォーマット実行
pnpm format
```

## プロジェクト構造

```
template-gamma/
├── apps/
│   └── web/                 # Next.js アプリケーション
├── packages/
│   ├── bff/                 # BFF層
│   ├── core/                # Core層（ビジネスロジック）
│   ├── adapters/            # Adapter層
│   ├── contracts/           # 契約・エラーコード
│   └── generated/           # 生成されたコード
└── __tests__/               # テストファイル
```
