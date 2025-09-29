# 実装タスクリスト

## 概要

このタスクリストは、Template Gamma プロジェクトの段階的実装を目的としています。Windows環境での開発・確認とLinux環境でのOpenNextビルド・デプロイを明確に分離し、効率的な開発フローを実現します。

## 実行環境の分離

### Windows環境での作業

- Next.js開発サーバー（`next dev`）での機能実装・確認
- 単体テスト・統合テストの実行
- OpenAPI契約の定義・型生成
- コード品質チェック（ESLint、Prettier）

### Linux環境での作業

- OpenNextビルド（`@opennextjs/cloudflare build`）
- Wranglerによるデプロイ・プレビュー
- Cloudflare Workers環境での動作確認
- 本番環境でのパフォーマンステスト

## フェーズ1: Windows環境での基盤構築・機能実装

- [x] 1. プロジェクト基盤とツールチェーンの構築
  - プロジェクト構造の作成、pnpm ワークスペース設定、基本的な開発ツール（ESLint、Prettier、Vitest）の導入
  - **Windows環境**: `next dev` で動作確認可能な状態まで構築
  - _要件: 15.1, 16.1, 16.4, 20.4_

- [x] 2. OpenAPI 契約定義と型生成システムの構築
  - OpenAPI 仕様書の作成、openapi-typescript と orval による型・クライアント生成の設定
  - **Windows環境**: 型生成スクリプトの動作確認、生成された型の利用確認
  - _要件: 5.1, 5.2, 18.1, 18.2, 20.1_

- [x] 3. Core 層の基本機能実装
  - ヘルスチェック、ユーザー、画像に関する純粋関数とビジネスロジックの実装
  - **Windows環境**: 単体テストで動作確認、環境非依存の純粋関数として実装
  - _要件: 1.1, 10.1, 11.1_

- [x] 4. Adapters 層の実装（モック版）
  - Supabase、Storage、Logger、TraceContext の各アダプタ実装（開発用モック含む）
  - **Windows環境**: モックアダプタで動作確認、実際のSupabase接続は環境変数で切替可能
  - _要件: 6.1, 7.1, 7.2, 13.1, 13.4_

- [x] 5. BFF 層の実装
  - Core 層と Adapters を組み合わせたビジネスファサード層の実装
  - **Windows環境**: モックアダプタを使用した統合テストで動作確認
  - _要件: 5.5, 17.3_

- [x] 6. Next.js アプリケーションの基本構造構築
  - App Router 構成、middleware、基本ページの作成
  - **Windows環境**: `next dev` でページ表示・ルーティング確認
  - _要件: 2.1, 6.2, 16.1_

- [x] 7. ヘルスチェック機能の実装
  - liveness、readiness、diagnostics の各エンドポイント実装
  - **Windows環境**: `next dev` で API エンドポイントの動作確認、モックデータでのレスポンス確認
  - _要件: 1.1, 1.2, 1.3, 12.1, 12.2, 12.3_

- [x] 8. 認証システムの実装（モック版）
  - Supabase Auth 統合、ログイン・ログアウト・コールバック処理（開発用モック含む）
  - **Windows環境**: モック認証での画面遷移確認、実際のSupabase Authは環境変数で切替
  - _要件: 2.2, 2.3, 2.4, 2.5, 6.1_

- [x] 9. ユーザー情報永続化の実装（モック版）
  - データベーススキーマ定義、ユーザー登録・更新処理（メモリ内モック）
  - **Windows環境**: モックデータベースでの CRUD 操作確認
  - _要件: 10.1, 10.2, 10.3, 10.4_

- [x] 10. 画像管理機能の実装（モック版）
  - 画像アップロード、一覧表示、削除機能の実装（ローカルファイルシステム使用）
  - **Windows環境**: ローカルファイルでの画像アップロード・表示確認
  - _要件: 4.1, 4.2, 4.3, 4.4, 11.1, 11.2_

- [x] 11. エラーハンドリングシステムの実装
  - エラーコード体系、統一エラーレスポンス、バリデーション処理
  - **Windows環境**: `next dev` でエラーレスポンスの確認、Zodバリデーションのテスト
  - _要件: 5.5, 5.6, 8.1, 21.3_

- [x] 12. 観測性とモニタリングの実装（開発版）
  - 構造化ログ（開発用pretty出力）、TraceContext 実装
  - **Windows環境**: コンソールでのログ出力確認、TraceContextの生成・継承確認
  - _要件: 7.1, 7.2, 7.3, 13.1, 13.4_

- [x] 12.1. 既存ログの構造化ログへの置き換え
  - console.log/error を構造化ログ（Pino）に置き換え、TraceContext統合
  - **Windows環境**: API Routes、クライアントコンポーネント、BFF層の全ログを構造化ログに統一
  - _要件: 7.1, 7.2, 7.3, 13.1_

- [x] 13. 2モード切替機能の実装
  - monolith/service モードの切替、依存方向リンターの設定
  - **Windows環境**: 環境変数でのモード切替確認、ESLintでの依存方向チェック
  - _要件: 17.1, 17.2, 17.4_

- [x] 13.1. モード切替機能の修正（レビュー対応）
  - レビュー内容：tmp\backend-mode-review.md
  - **問題1**: MonolithServiceFactoryが依存なしでサービス生成（SupabaseAdapter等が未定義でランタイムエラー）
  - **問題2**: Node.jsが.tsファイルを直接require不可（ERR_UNKNOWN_FILE_EXTENSION）
  - **対応1**: packages/bff/src/mode-factory.tsで既存ServiceFactory.create()パターンを活用
  - **対応2**: package.json validate:modeスクリプトでtsx使用、CI workflow修正
  - **Windows環境**: 修正後のファクトリーでサービス生成・メソッド呼び出し確認、pnpm validate:mode成功確認
  - _要件: 17.1, 17.2_

- [x] 14. テストスイートの実装
  - 単体テスト、統合テスト、E2E テスト（Next.js開発サーバー対象）の実装
  - **Windows環境**: Vitest、Playwright での全テスト実行・合格確認
  - _要件: 21.1, 21.2, 21.3, 21.4_

- [x] 14.1. OpenNext ビルド静的検証（Linux スモークビルド）
  - CI での OpenNext ビルド検証（デプロイなし）、wrangler.jsonc 設定検証
  - **Linux環境（CI のみ）**: `@opennextjs/cloudflare build` + `wrangler deploy --dry-run` の成功確認
  - **オプション**: `pnpm opennextjs-cloudflare preview` でローカル Workers ランタイム動作確認
  - _要件: 15.2, 16.2, 19.1_

- [x] 15. ドキュメント整備
  - プロジェクト全体のドキュメント作成・更新、開発者向けガイドの整備
  - **Windows環境**: 各種ドキュメントの作成・更新、READMEの充実
  - **作成対象**:
    - `docs/ci-cd.md`: CI/CDパイプライン説明（GitHub Actions、テスト戦略、デプロイフロー）
    - `docs/architecture.md`: システムアーキテクチャ設計書（レイヤー構成、依存関係、モード切替）
    - `docs/development.md`: 開発環境セットアップガイド（Windows/Linux環境、ツールチェーン）
    - `docs/api.md`: API仕様書（OpenAPI連携、エラーハンドリング、認証フロー）
    - `docs/testing.md`: テスト戦略書（単体・統合・E2Eテスト、モック戦略）
    - `docs/deployment.md`: デプロイメントガイド（OpenNext、Cloudflare Workers、環境変数）
    - `README.md`: プロジェクト概要の更新（クイックスタート、主要機能、技術スタック）
  - _要件: 開発者体験向上、プロジェクト理解促進、保守性向上_

- [x] 16. フェーズ1レビュー対応
  - フェーズ1完了後のコードレビュー指摘事項への対応
  - tmp\phase1-review.md, 及び#1のプルリクのレビュー内容を確認し、必要に応じて対応
  - 理由があり対応しないものは理由をまとめる
  - **Windows環境**: レビュー指摘事項の修正、テスト実行による動作確認
  - **対応内容**: コード品質改善、設計見直し、テストカバレッジ向上、ドキュメント整備
  - _要件: 全般的な品質向上_

## フェーズ2: Linux環境でのCloudflare Workers対応

- [ ] 17. Cloudflare Workers デプロイ設定の準備
  - OpenNext ビルド設定、Wrangler 設定ファイル、環境変数管理の設定
  - **Linux環境必須**: OpenNext Cloudflareアダプタの設定、wrangler.jsonc作成
  - _要件: 15.2, 15.3, 16.2, 16.3, 19.1, 19.2_

- [ ] 18. Adapters層のCloudflare Workers対応
  - 実際のSupabase接続、Cloudflare Workers環境でのLogger実装
  - **Linux環境必須**: Workers環境での動作確認、env バインディングの利用
  - _要件: 6.1, 7.1, 7.2, 13.1, 13.2_

- [ ] 19. OpenNextビルドとローカルプレビュー
  - `@opennextjs/cloudflare build` の実行、`wrangler preview` での動作確認
  - **Linux環境必須**: .open-next ディレクトリの生成、Workers環境での全機能確認
  - _要件: 15.2, 19.1_

- [ ] 20. Sentry統合とモニタリング
  - `@sentry/cloudflare` の統合、Workers Logs での構造化ログ確認
  - **Linux環境必須**: Workers環境でのSentry動作確認、ログ収集の確認
  - _要件: 13.2, 13.3_

- [ ] 21. CI/CD パイプラインの構築
  - GitHub Actions、品質ゲート、自動デプロイの設定
  - **Linux環境必須**: GitHub Actions での OpenNext ビルド・デプロイ確認
  - _要件: 15.1, 15.4, 20.1, 20.2, 20.3_

- [ ] 22. パフォーマンス最適化と最終検証
  - 性能目標の達成、全機能の統合テスト、本番環境での動作確認
  - **Linux環境必須**: Workers環境でのパフォーマンステスト、本番デプロイ確認
  - _要件: 8.1, 8.2, 21.4_

## 受け入れ基準

### フェーズ1完了基準（Windows環境）

- 主要ユースケース（Top→Login→Home→Logout）と `/healthz|/readyz` の E2E テスト合格
- Zod バリデーションが 422 を返却し、統一エラー封筒で返すことを確認
- OpenAPI 型生成（openapi-typescript/orval）の生成物のみをクライアントが使用
- **Linux スモークビルド CI が通る**（OpenNext 変換 + `wrangler preview --dry-run` 成功）

### フェーズ2完了基準（Linux環境）

- `@opennextjs/cloudflare` でビルド → `.open-next` 生成成功
- `wrangler.jsonc` で `compatibility_date` 固定、`nodejs_compat` 有効、KV バインディング設定済み
- `.dev.vars`（開発）/Secrets（本番）の分離運用で起動し、env バインディングから取得可能
- Sentry（Cloudflare）でエラー捕捉のみ有効（`tracesSampleRate: 0`）、PII なし
- KV 上の ISR キャッシュが効くことを確認

## 開発フロー

1. **フェーズ1（Windows）**: 全機能を `next dev` で実装・確認 + Linux スモークビルド CI
2. **フェーズ1完了時**: 上記受け入れ基準の達成確認
3. **フェーズ2（Linux）**: Cloudflare Workers環境への移植・最適化
4. **フェーズ2完了時**: 上記受け入れ基準の達成確認、本番デプロイ完了

## 設定例

### wrangler.jsonc（R2版 - 最新推奨）

```json
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "template-gamma",
  "main": ".open-next/worker.js",
  "assets": {
    "directory": ".open-next/assets",
    "binding": "ASSETS"
  },
  "compatibility_date": "2025-09-23",
  "compatibility_flags": ["nodejs_compat"],
  "r2_buckets": [
    {
      "binding": "NEXT_CACHE_R2",
      "bucket_name": "template-gamma-cache"
    }
  ]
}
```

### 環境変数管理

```bash
# .dev.vars（ローカル開発用 - 機微情報以外）
SUPABASE_URL=your-supabase-url
SUPABASE_ANON_KEY=your-anon-key
LOG_LEVEL=debug
BACKEND_MODE=monolith

# Secrets（機微情報のみ）
# wrangler secret put SUPABASE_SERVICE_ROLE_KEY
# wrangler secret put SENTRY_DSN
```

### CI スモークビルド例

```yaml
jobs:
  opennext-smoke:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '22' }
      - run: corepack enable && pnpm install --frozen-lockfile
      - run: pnpm build && pnpm exec @opennextjs/cloudflare build
      - run: pnpm exec wrangler deploy --dry-run
```

### 重要な実装注意点

- **Edge ランタイム禁止**: `export const runtime = "edge"` をコードベースから除去すること
- **互換性要件**: `compatibility_date >= 2024-09-23` + `nodejs_compat` が必須
- **キャッシュ方式**: R2版（最新）を採用、KV版との混在は禁止
- **Sentry設定**: `@sentry/cloudflare` + `tracesSampleRate: 0`（エラー収集のみ）
