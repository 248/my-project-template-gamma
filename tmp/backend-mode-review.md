# レビュー結果 (タスク13: 2モード切替機能)

## 指摘事項

1. ~~**重大** packages/bff/src/mode-factory.ts:35-48~~（解消済）
   - MonolithServiceFactory が各サービスを new HealthServiceImpl() といった形で依存なしに生成していたため、SupabaseAdapter や Logger が undefined となるリスクがありました。
   - 現在は既存の \*ServiceFactory.create(...) を経由して依存を注入する実装に修正され、問題は解消されています。

2. **重大** package.json:30, .github/workflows/ci-matrix.yml:73
   - pnpm validate:mode と CI ステップを tsx 実行に切り替えていますが、どちらも "import { ... } from ./packages/contracts/backend-mode.js" を使用しており、実体となる .js ファイルが存在しないため ERR_MODULE_NOT_FOUND で失敗します（ソースは backend-mode.ts のまま）。
   - import 先を .ts に戻すか、ビルド済みの .js を用意するなど、実体のあるパスに修正してください。

## 再レビュー所見

- サービスファクトリーの依存注入問題は解消されたことを確認しました。
- 上記 2 の import パス修正が未対応のため、モード検証スクリプトと CI ワークフローは依然としてエラーになります。
