# レビュー結果 (タスク13: 2モード切替機能)

## 指摘事項

1. **重大** packages/bff/src/mode-factory.ts:35-48
   - MonolithServiceFactory が各サービスを new HealthServiceImpl() といった形で依存なしに生成していますが、これらの実装は SupabaseAdapter や Logger など必須依存をコンストラクタで受け取る設計です（例: packages/bff/src/health/health-service.ts:44-50）。
   - このままでは生成されたサービスのメソッド呼び出し時に this.supabaseAdapter などが undefined となり、要件17で求めるモード切替後のBFF処理が正常に動作しません。
   - 既存の \*ServiceFactory.create(...) を流用する、もしくは必要なアダプタとロガーを注入してから返すような実装に修正してください。

2. **重大** package.json:30, .github/workflows/ci-matrix.yml:73
   - pnpm validate:mode と CI ステップで node -e "... require('./packages/contracts/backend-mode.ts') ..." を実行していますが、Node.js は素の .ts ファイルを require できません（type: "module" かつ export type を含むため ERR_UNKNOWN_FILE_EXTENSION が発生します）。
   - そのためモード検証用スクリプト／ワークフローが常に失敗します。ビルド済みの .js を読み込むか、ts-node / tsx のようなランタイムを使ってください。
