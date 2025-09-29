# CI/CDパイプライン

## 概要

Template Gammaプロジェクトでは、GitHub Actionsを使用した自動化されたCI/CDパイプラインを構築しています。Windows環境での開発とLinux環境でのOpenNextビルド・デプロイを明確に分離し、効率的な開発フローを実現します。

## CI/CD戦略

### 開発フロー

```mermaid
graph LR
    A[開発者] --> B[Windows環境]
    B --> C[next dev]
    C --> D[機能実装・確認]
    D --> E[Git Push]
    E --> F[GitHub Actions]
    F --> G[Linux環境]
    G --> H[OpenNext Build]
    H --> I[Wrangler Deploy]
```

### 環境分離

- **Windows環境**: 開発・テスト・機能確認
- **Linux環境（CI）**: OpenNextビルド・デプロイ・本番検証

## GitHub Actions ワークフロー

### 1. メインCI（ci.yml）

**トリガー**: Push、Pull Request

**実行内容**:

- Node.js 22環境のセットアップ
- 依存関係のインストール（pnpm）
- OpenAPI型生成と契約検証
- コード品質チェック（ESLint、Prettier、TypeScript）
- テスト実行
- Next.jsビルド

```yaml
# .github/workflows/ci.yml の主要ステップ
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '22'

      - name: Setup pnpm
        uses: pnpm/action-setup@v4
        with:
          version: 9

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Generate OpenAPI types and client
        run: pnpm openapi:generate

      - name: Lint OpenAPI specification
        run: pnpm openapi:lint

      - name: Type check
        run: pnpm type-check

      - name: Lint
        run: pnpm lint

      - name: Format check
        run: pnpm format:check

      - name: Test
        run: pnpm test

      - name: Build
        run: pnpm build
```

**注意**: バックエンドモード別テスト（monolith/service）は `opennext-smoke.yml` ワークフローで実行されます。

### 2. OpenNext スモークビルド（opennext-smoke.yml）

**トリガー**: Push、Pull Request

**目的**: Linux環境でのOpenNextビルド検証（デプロイなし）

**実行内容**:

- OpenNext Cloudflareアダプタによるビルド
- Wrangler設定の検証（dry-run）
- .open-nextディレクトリの生成確認

```yaml
# .github/workflows/opennext-smoke.yml の主要ステップ
jobs:
  opennext-smoke:
    runs-on: ubuntu-latest
    steps:
      - name: Build with OpenNext
        run: |
          pnpm build
          pnpm exec @opennextjs/cloudflare build

      - name: Validate Wrangler config
        run: pnpm exec wrangler deploy --dry-run
```

### 3. E2Eテスト（将来実装）

**トリガー**: 手動実行、リリース前

**実行内容**:

- Playwrightによるブラウザテスト
- 認証フローの検証
- 画像管理機能の検証

## テスト戦略

### テストピラミッド

```
    E2E Tests (少数・重要フロー)
         ↑
   Integration Tests (API・認証)
         ↑
    Unit Tests (多数・高速)
```

### 1. 単体テスト（Unit Tests）

- **対象**: Core層、BFF層、Adapters層
- **ツール**: Vitest
- **実行頻度**: 全Push・PR
- **カバレッジ**: 80%以上を目標

### 2. 統合テスト（Integration Tests）

- **対象**: APIエンドポイント、認証フロー
- **ツール**: Vitest + MSW
- **実行頻度**: 全Push・PR
- **検証内容**:
  - API契約の遵守
  - エラーハンドリング
  - バリデーション

### 3. E2Eテスト（End-to-End Tests）

- **対象**: ユーザーフロー
- **ツール**: Playwright
- **実行頻度**: リリース前、手動実行
- **検証内容**:
  - Top→Login→Home→Logout フロー
  - ヘルスチェック機能
  - 画像管理機能

### バックエンドモード別テスト

```bash
# CI マトリクス実行
BACKEND_MODE=monolith pnpm test
BACKEND_MODE=service pnpm test
```

両モードでの動作を保証し、将来のアーキテクチャ変更に対応。

## デプロイフロー

### 1. 開発環境（Development）

- **トリガー**: `develop`ブランチへのPush
- **デプロイ先**: Cloudflare Workers Preview
- **検証**: 基本機能の動作確認

### 2. ステージング環境（Staging）

- **トリガー**: `main`ブランチへのマージ
- **デプロイ先**: Cloudflare Workers Staging
- **検証**: 全機能の統合テスト

### 3. 本番環境（Production）

- **トリガー**: リリースタグの作成
- **デプロイ先**: Cloudflare Workers Production
- **検証**:
  - パフォーマンステスト
  - セキュリティチェック
  - ヘルスチェック

## 品質ゲート

### 必須チェック項目

1. **コード品質**
   - ESLint: エラー0件
   - Prettier: フォーマット準拠
   - TypeScript: 型エラー0件

2. **契約検証**
   - OpenAPI Lint: 仕様書の妥当性
   - 生成物同期: 型とクライアントの整合性
   - Breaking Change: API契約の後方互換性

3. **テスト**
   - 単体テスト: 全テスト合格
   - 統合テスト: API動作確認
   - バックエンドモード: 両モード動作確認

4. **ビルド検証**
   - Next.js Build: 成功
   - OpenNext Build: .open-next生成成功
   - Wrangler Dry-run: 設定検証成功

### 自動修正

以下の項目は自動修正を実行：

- **pre-commit**: lint-staged による自動修正
- **Renovate**: 依存関係の自動更新（minor）
- **GitHub Actions**: フォーマット自動修正PR

## 監視・アラート

### ビルド監視

- **成功率**: 95%以上を維持
- **実行時間**: 5分以内を目標
- **失敗時**: Slack通知（将来実装）

### デプロイ監視

- **デプロイ成功率**: 99%以上
- **ロールバック時間**: 1分以内
- **ヘルスチェック**: デプロイ後自動実行

## トラブルシューティング

### よくある問題

1. **OpenNext ビルド失敗**

   ```bash
   # 解決方法
   rm -rf .next .open-next
   pnpm build
   pnpm opennext:build
   ```

2. **Wrangler 設定エラー**

   ```bash
   # 設定検証
   pnpm opennext:deploy:dry

   # ログ確認
   wrangler tail
   ```

3. **テスト失敗**

   ```bash
   # 単体テスト
   pnpm test:unit --reporter=verbose

   # 統合テスト
   pnpm test:integration --reporter=verbose
   ```

### デバッグ手順

1. **ローカル再現**

   ```bash
   # CI環境の再現
   BACKEND_MODE=monolith pnpm test:all
   BACKEND_MODE=service pnpm test:all
   ```

2. **ログ確認**
   - GitHub Actions ログ
   - Wrangler ログ
   - Cloudflare Workers ログ

3. **設定確認**
   - wrangler.jsonc
   - .dev.vars
   - 環境変数

## セキュリティ

### Secrets管理

- **GitHub Secrets**: CI/CD用の機密情報
- **Wrangler Secrets**: Cloudflare Workers用の機密情報
- **環境変数**: 非機密情報は.dev.varsで管理

### 脆弱性スキャン

- **依存関係**: npm audit（自動実行）
- **コード**: CodeQL（GitHub Security）
- **コンテナ**: 該当なし（Serverless）

## パフォーマンス

### ビルド最適化

- **並列実行**: テストの並列化
- **キャッシュ**: node_modules、.next、pnpm store
- **増分ビルド**: 変更ファイルのみ処理

### 目標指標

- **CI実行時間**: 5分以内
- **デプロイ時間**: 2分以内
- **テスト実行時間**: 3分以内

## 今後の改善予定

1. **E2Eテストの自動化**
2. **パフォーマンステストの追加**
3. **セキュリティスキャンの強化**
4. **監視・アラートの実装**
5. **Blue-Greenデプロイの導入**
