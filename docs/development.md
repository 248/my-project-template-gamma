# 開発環境セットアップガイド

## 概要

Template Gammaプロジェクトの開発環境セットアップ手順を説明します。Windows環境での開発とLinux環境でのOpenNextビルド・デプロイを前提としています。

## 前提条件

### 必須ソフトウェア

1. **Node.js 22**
   - 公式サイトからダウンロード: https://nodejs.org/
   - LTS版を推奨
   - インストール確認: `node --version`

2. **pnpm**
   - Node.js 22に同梱のcorepackを使用
   - 有効化: `corepack enable`
   - 確認: `pnpm --version`

3. **Git**
   - 公式サイトからダウンロード: https://git-scm.com/
   - 設定: `git config --global user.name "Your Name"`
   - 設定: `git config --global user.email "your.email@example.com"`

### 推奨ソフトウェア

1. **Visual Studio Code**
   - 公式サイトからダウンロード: https://code.visualstudio.com/
   - 推奨拡張機能は後述

2. **Windows Terminal**
   - Microsoft Storeからインストール
   - PowerShellまたはコマンドプロンプトを使用

## プロジェクトセットアップ

### 1. リポジトリのクローン

```bash
# HTTPSでクローン
git clone https://github.com/your-org/template-gamma.git
cd template-gamma

# SSHでクローン（推奨）
git clone git@github.com:your-org/template-gamma.git
cd template-gamma
```

### 2. 依存関係のインストール

```bash
# 初回セットアップ（依存関係インストール + 型生成）
pnpm setup

# または手動で実行
pnpm install --frozen-lockfile
pnpm openapi:generate
```

### 3. 環境変数の設定

```bash
# 開発用環境変数ファイルをコピー
copy .env.example .dev.vars
copy .env.local.example .env.local
```

`.dev.vars`ファイルを編集：

```bash
# Supabase設定
SUPABASE_URL=your-supabase-project-url
SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# ログレベル
LOG_LEVEL=debug

# バックエンドモード
BACKEND_MODE=monolith
```

### 4. 開発サーバーの起動

```bash
# 開発サーバー起動
pnpm dev

# ブラウザで確認
# http://localhost:3000
```

## Windows環境での開発

### 開発フロー

1. **機能実装**: `next dev`での動作確認
2. **テスト実行**: 単体・統合テストの実行
3. **コード品質**: ESLint、Prettierによるチェック
4. **型生成**: OpenAPI仕様書からの型生成

### よく使用するコマンド

```bash
# 開発サーバー
pnpm dev                    # 開発サーバー起動

# コード品質
pnpm lint                   # ESLint実行
pnpm lint:fix              # ESLint自動修正
pnpm format                # Prettier実行
pnpm format:check          # Prettierチェック
pnpm type-check            # TypeScript型チェック

# テスト
pnpm test                  # 全テスト実行
pnpm test:unit             # 単体テスト
pnpm test:integration      # 統合テスト
pnpm test:watch            # テスト監視モード
pnpm test:ui               # テストUI

# OpenAPI
pnpm openapi:generate      # 型とクライアント生成
pnpm openapi:lint          # OpenAPI仕様書Lint
pnpm openapi:check         # 生成物同期チェック

# ビルド
pnpm build                 # Next.jsビルド
pnpm start                 # プロダクションサーバー起動
```

### Visual Studio Code設定

#### 推奨拡張機能

```json
{
  "recommendations": [
    "esbenp.prettier-vscode",
    "bradlc.vscode-tailwindcss",
    "ms-vscode.vscode-typescript-next",
    "vitest.explorer",
    "ms-playwright.playwright",
    "redhat.vscode-yaml",
    "42crunch.vscode-openapi"
  ]
}
```

#### ワークスペース設定

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "typescript.preferences.importModuleSpecifier": "relative",
  "files.eol": "\n",
  "files.insertFinalNewline": true,
  "files.trimTrailingWhitespace": true
}
```

## Linux環境での作業

### OpenNextビルド・デプロイ

Linux環境（CI/CD、WSL、Docker）でのOpenNextビルドとCloudflare Workersデプロイを行います。

```bash
# Next.jsビルド
pnpm build

# OpenNext Cloudflareアダプタでビルド
pnpm opennext:build

# ローカルプレビュー（Workersランタイム）
pnpm opennext:preview

# デプロイ（ドライラン）
pnpm opennext:deploy:dry

# 実際のデプロイ
wrangler deploy
```

### WSL2での開発（オプション）

Windows上でLinux環境を使用する場合：

```bash
# WSL2のインストール
wsl --install

# Ubuntuの起動
wsl

# Node.js 22のインストール
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs

# pnpmの有効化
corepack enable

# プロジェクトのクローン
git clone https://github.com/your-org/template-gamma.git
cd template-gamma

# 依存関係のインストール
pnpm install --frozen-lockfile
```

## 外部サービスの設定

### Supabase設定

1. **プロジェクト作成**
   - https://supabase.com/ でアカウント作成
   - 新しいプロジェクトを作成
   - プロジェクトURLとAPIキーを取得

2. **データベーススキーマ**

   ```sql
   -- app_usersテーブル
   CREATE TABLE app_users (
     id UUID PRIMARY KEY DEFAULT auth.uid(),
     created_at TIMESTAMPTZ DEFAULT NOW(),
     updated_at TIMESTAMPTZ DEFAULT NOW(),
     last_login_at TIMESTAMPTZ DEFAULT NOW()
   );

   -- RLSの有効化
   ALTER TABLE app_users ENABLE ROW LEVEL SECURITY;

   -- ポリシーの作成
   CREATE POLICY "Users can view own record" ON app_users
     FOR SELECT USING (auth.uid() = id);
   ```

3. **Storageバケット**
   - `user-images`バケットを作成
   - RLSポリシーを設定

### Cloudflare Workers設定

1. **アカウント作成**
   - https://cloudflare.com/ でアカウント作成
   - Workers & Pagesプランを選択

2. **Wrangler CLI**

   ```bash
   # Wranglerのインストール（グローバル）
   npm install -g wrangler

   # ログイン
   wrangler login

   # プロジェクト設定の確認
   wrangler whoami
   ```

3. **KVネームスペースの作成**

   ```bash
   # 本番用
   wrangler kv:namespace create "NEXT_CACHE_WORKERS_KV"

   # プレビュー用
   wrangler kv:namespace create "NEXT_CACHE_WORKERS_KV" --preview
   ```

## トラブルシューティング

### よくある問題と解決方法

#### 1. pnpmコマンドが見つからない

```bash
# 解決方法
corepack enable
```

#### 2. 型生成エラー

```bash
# OpenAPI仕様書の確認
pnpm openapi:lint

# 型生成の再実行
pnpm openapi:generate
```

#### 3. テスト実行エラー

```bash
# キャッシュのクリア
pnpm test --clearCache

# 依存関係の再インストール
rm -rf node_modules
pnpm install
```

#### 4. Playwrightブラウザエラー

```bash
# ブラウザのインストール
npx playwright install

# 依存関係のインストール（Linux）
npx playwright install-deps
```

#### 5. OpenNextビルドエラー

```bash
# キャッシュのクリア
rm -rf .next .open-next

# 再ビルド
pnpm build
pnpm opennext:build
```

### デバッグ手順

#### 1. ログの確認

```bash
# 開発サーバーのログ
pnpm dev

# テストのログ
pnpm test --reporter=verbose

# Wranglerのログ
wrangler tail
```

#### 2. 環境変数の確認

```bash
# 環境変数の表示
echo $NODE_ENV
echo $BACKEND_MODE

# .dev.varsの確認
cat .dev.vars
```

#### 3. 依存関係の確認

```bash
# パッケージの確認
pnpm list

# 型生成の確認
ls -la packages/generated/
```

## 開発ワークフロー

### 日常的な開発フロー

1. **朝の作業開始**

   ```bash
   git pull origin main
   pnpm install
   pnpm openapi:generate
   pnpm dev
   ```

2. **機能開発**

   ```bash
   # 新しいフィーチャーブランチを作成
   git checkout -b feature/new-feature

   # 開発・テスト
   pnpm test:watch

   # コード品質チェック
   pnpm lint:fix
   pnpm format
   ```

3. **コミット前**

   ```bash
   # 全テスト実行
   pnpm test:all

   # 型チェック
   pnpm type-check

   # OpenAPI契約チェック
   pnpm openapi:check
   ```

4. **プルリクエスト**
   ```bash
   git add .
   git commit -m "feat: add new feature"
   git push origin feature/new-feature
   # GitHub上でdevelopブランチ向けのPRを作成
   ```

### コードレビューのポイント

1. **型安全性**
   - OpenAPI契約との整合性
   - TypeScriptの型定義

2. **テストカバレッジ**
   - 単体テストの追加
   - 統合テストの確認

3. **コード品質**
   - ESLint・Prettierの準拠
   - 依存方向の確認

4. **セキュリティ**
   - 認証・認可の実装
   - PII情報の取り扱い

## パフォーマンス最適化

### 開発環境の高速化

1. **pnpmキャッシュ**

   ```bash
   # キャッシュの確認
   pnpm store path

   # キャッシュのクリア
   pnpm store prune
   ```

2. **TypeScriptコンパイル**

   ```bash
   # インクリメンタルビルド
   pnpm type-check --incremental
   ```

3. **テスト実行**

   ```bash
   # 並列実行
   pnpm test --run --reporter=basic

   # 変更ファイルのみ
   pnpm test:watch
   ```

## セキュリティ

### 開発環境のセキュリティ

1. **環境変数管理**
   - `.dev.vars`をGit管理から除外
   - 機密情報の適切な管理

2. **依存関係の監査**

   ```bash
   # 脆弱性チェック
   pnpm audit

   # 自動修正
   pnpm audit --fix
   ```

3. **コードスキャン**
   - ESLintセキュリティルール
   - GitHub Security Advisories

## まとめ

Template Gammaの開発環境は以下の特徴があります：

- **Windows環境**: 日常的な開発・テスト
- **Linux環境**: OpenNextビルド・デプロイ
- **型安全性**: OpenAPI-First開発
- **品質保証**: 自動テスト・リント
- **効率性**: pnpmワークスペース・ホットリロード

適切なセットアップにより、効率的で品質の高い開発が可能になります。
