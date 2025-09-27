# 要件定義書（v0.6）— Template Gamma（OpenNext × Cloudflare × Supabase）

## 0. 目的 / 背景

- Web アプリケーション開発用のプロジェクトテンプレートとして活用し、後続の開発の効率化を図る。
- フロントとバックを **Cloudflare Workers** 上に集約し、**Supabase (Auth + Postgres + Storage)** をバックエンドの中核に据える。
- 最初は **「結合（1 Worker）」＋ヘルスチェックのみ**で稼働。
- 次段階として **Supabase 認証を導入**し、「トップページ→ログイン→認証必須のホーム」までを実現する。
- 型安全性を担保するために **OpenAPI 定義から API を生成し、フロントとバックで共通利用**する方針を採用する。
- 境界を曖昧にせず、将来 Go / Python / Hono 等へ移行できるように **論理的二層構成（UI/BFF vs Core）** を維持する。
- **利用フレームワーク/ライブラリのバージョンは固定**: Next.js **15.5.2**、React **19.0.0**。

---

## システム構成（想定）

- **実行基盤**: Next.js (App Router) を OpenNext でビルドし、Cloudflare Workers 上で **1 Worker（結合）** として稼働。静的ファイルは Cloudflare CDN 経由で配信。
- **境界/層**: UI/極薄 API = `apps/web`、業務ロジック = `packages/{bff,core}`。依存は `web → bff → core` の一方向。API 境界は **OpenAPI** が単一の真実。
- **認証/DB/ストレージ**: Supabase (Auth + Postgres + Storage)。RLS を前提に Edge クライアントから呼び出し。
- **キャッシュ/非同期**: 初期は利用しないが、将来的に **KV**（ISR/JSON キャッシュ）と **Queues**（再生成や軽量バッチ処理）を採用可能。
- **画像処理**: 最小構成。必要に応じて Cloudflare Images または Supabase Storage + Next.js loader を追加。
- **ロギング**: Workers Logs を前提に **pino による構造化ログ**を標準化。`requestId` / `traceId` を全ログに必須付与。開発環境は pretty-print、本番は JSON 単行で出力。Workers 環境では `console.log(JSON.stringify(...))` を必須とし、Logpush で外部に転送可能にする。
- **型安全**: OpenAPI-First + Zod による契約駆動。契約→生成（型/クライアント）→実装。CI で差分と破壊的変更を検知。
- **デプロイ/CI**: Wrangler + GitHub Actions を利用し、Preview/Production にデプロイ。Secrets は Wrangler 側で管理。
- **将来分離**: `BACKEND_MODE=monolith|service` により、BFF を外部サービス（Hono/Go/Python 等）へ切替可能（HTTP or Service Bindings）。UI/Core は無改修。

---

## 1. スコープ（段階的）

### フェーズ1（MVP-0）

- `/health` (SSR) と `/api/health` (JSON) のみ提供
- CI/CD（Wrangler, GitHub Actions）と Secrets 管理を確立
- Supabase は接続チェックのみに利用可能（ON/OFF可）

### フェーズ2（MVP-1: 認証 + ホーム拡張）

- **認証フロー**: トップページ → ログイン → コールバック → ホーム → ログアウト
- **挙動**: 未認証で `/home` にアクセスすると `/` にリダイレクト。ログイン後は `/home` 表示。
- **ホーム拡張**: `/home` に **バックエンド・ヘルスチェック実行ボタン**を配置。押下で `/api/health` を呼び、結果を画面表示。
- **API 生成**: OpenAPI 契約から型とクライアントを生成し、フロントは生成クライアントを利用。Route Handlers は契約準拠。

### 将来フェーズ

- Cloudflare Queues / KV / Images を利用開始
- バックエンド分離（Service Bindings）や GCP 移行を選択的に実施

---

## 2. 機能要件（MVP-1）

- トップページ: ログインボタン表示
- ログイン: `/auth/login` → Supabase OAuth → `/auth/callback` → セッション発行
- ホームページ: **認証必須**、ログイン済のみ閲覧可。
  - **画像アップロードUIを提供**（未認証ユーザはアップロード不可）
  - **ユーザ自身に紐づく画像の一覧表示**（最新順、ページング/無限スクロールいずれか）
  - 画像は処理状態（`uploading/processing/ready/failed`）を表示し、`ready` で表示可能
- ログアウト: `/auth/logout` でセッション削除
- API 契約: `/api/health` と `/auth/*` は OpenAPI 準拠
- **API エラー設計**: エラーは必ず **コード + メッセージ**で返却。コード定義は `packages/contracts/error-codes.ts` に一元管理し、フロント/バック双方で参照可能にする。

---

## 3. 非機能要件

- セッション管理は **Supabase Auth Cookie** を利用
- 認証チェックは **Next.js middleware** で実施
- **認可（画像関連）**:
  - 画像の**作成/更新/削除**は **認証済みユーザのみ**許可
  - 画像の**参照**は既定で**アップロードした本人のみ**（共有や公開は将来要件で別途定義）
  - 画像は**ユーザIDに強固に紐付け**、IDスプーフィングを防止
- セキュリティ: Cookie は `HttpOnly, Secure, SameSite=Lax`。Service Role Key はサーバ専用。
- 型安全性（OpenAPI-First）:
  - 契約→生成→実装の順で作業
  - 生成物をフロント/バックで共通利用
  - CI で Lint と Breaking Change 検知を実施
- 入力検証: **Zod** を利用し、OpenAPI スキーマから生成または手動定義して **型と実行時バリデーション**を統一
- ログ: **Workers Logs 前提の Pino 要件**
  - JSON 単行で出力し、`requestId` / `traceId` / `service` / `env` / `version` を必須項目とする
  - 機微情報（token/password/cookie/authorization）は redact で自動マスキング
  - エラーログは `logger.error({ err }, 'unhandled error')` 形式で stack を構造化
  - 開発環境では pretty-print、本番/CI では JSONL 出力
  - 長期保存が必要な場合は **Logpush → R2 or 外部SIEM** に転送
- パフォーマンス: `/api/health` 呼び出しは p95 < 300ms を目標。ホームのボタンは Loading/再試行制御を実装。
- 改行コード: **LF** に統一すること（`.gitattributes` で強制）
- テスト: **Vitest** を使用すること
- UI/デザイン: **Tailwind CSS** を利用し、[https://atlassian.design/components/](https://atlassian.design/components/) を参考にしたモダンなデザインとすること
- パッケージ管理: **pnpm** を使用すること（ワークスペース運用）
- Node 22、Wrangler compatibility_date 固定
- ESLint + Prettier + import整形、lint-staged+pre-commit
- Renovate 導入（minor 自動、major は PR）
- `pnpm dev` で wrangler dev + OpenAPI 生成チェック
- CI matrix で BACKEND_MODE=monolith|service を両方検証
- **マイグレーション運用ポリシー**:
  - スキーマの単一の真実は **Supabase CLI (SQL migrations)** に置く
  - `supabase migration new` で空SQLを生成し、開発者が記述
  - `supabase db diff` で差分SQLを自動生成し、人間がレビュー
  - すべてのマイグレーションSQLは Git 管理し、PR レビュー必須
  - CI で `supabase db reset` + `db push` を実行し、新規DBへの適用可否を検証
  - 将来バックエンドを分離する場合、サービス内部では Prisma 等のORMを利用可能。ただし **SQLマイグレーションが常に真実**とし、ORMのマイグレーションは補助的に扱う

---

## 4. ディレクトリ構成（MVP-1 時点）

```
openapi/
  openapi.yaml            # API 定義（単一の真実）

apps/web/                 # Next.js (UI + 極薄API)
  app/
    page.tsx              # トップ
    home/page.tsx         # 認証必須（ヘルスチェックボタン付き）
    api/health/route.ts   # JSONヘルス（契約準拠, bff経由）
    health/page.tsx       # SSRヘルス
    auth/
      login/route.ts
      callback/route.ts
      logout/route.ts
  middleware.ts
  next.config.js
  open-next.config.ts
  wrangler.toml

packages/core/             # ビジネスロジック (UI/HTTP非依存, 関数群)
packages/bff/              # BFF層 (OpenAPI契約 ←→ core)
packages/adapters/         # 環境依存実装 (Supabase, Cache, Logger 等)
  supabase-server.ts
packages/contracts/        # 運用ルールや契約規約
  error-codes.ts           # APIエラーコード定義
packages/generated/
  api-types/               # openapi から生成された型
  api-client/              # openapi から生成されたクライアント
```

---

## 5. 境界管理思想（重要）

- **論理的二層**: UI+極薄API (apps/web) と BFF+Core (packages)

- **契約の単一ソース**: OpenAPI = フロントとバックの境界

- **依存方向**: `web → bff → core` 一方向。逆流禁止

- **禁止事項**:
  - `apps/web` から core を直接呼ばない
  - core から Next.js や fetch など環境依存を import しない
  - Route Handlers 内にビジネスロジックを書かない（必ず bff 経由）

- **モード切替**:
  - `BACKEND_MODE=monolith` → bff を直呼び（同一Worker）
  - `BACKEND_MODE=service` → 生成クライアントで外部サービス呼び出し（Hono/Go/Python 等）
  - 将来の分離は apiClient 実装切替で完結

- **CIガード**:
  - import ルールで依存方向違反を検出
  - OpenAPI の breaking change 検出
  - Zod による入出力バリデーションの自動テスト

---

## 6. テスト観点

- `/health` SSR/JSON が応答
- 認証フロー（トップ→ログイン→ホーム→ログアウト）が機能
- ホームのヘルスチェックボタンが `/api/health` を叩き、結果表示（Loading, OK/Degraded/Down, 再試行）
- OpenAPI コントラクトテスト: 生成クライアントで型安全に呼べること
- Zod バリデーション: 不正入力が 422 で弾かれる
- **API エラーコード**: 返却されるコードと定義ファイルの整合性をテストで保証
- **マイグレーション検証**: CIで `supabase db reset` により全マイグレーション適用が可能であることを確認

---

## 7. マイルストーン

**M1: ヘルスチェック**

- `/health` と `/api/health` が稼働
- CI/CD 整備（Wrangler一本化）
- OpenAPI 初期化と型/クライアント生成

**M2: 認証 + ホーム拡張**

- Supabase Auth が疎通
- 認証フローが機能
- ホームにヘルスチェックボタン実装
- OpenAPI に `/auth/*` を追加し型付け
- Zod 検証を組み込み
- API エラーコードを contracts/error-codes.ts に整理
- マイグレーション運用ポリシーを運用開始

---

## 8. API 契約/型安全性（OpenAPI-First + Zod）

- **変更手順**: 契約 → 生成 → 実装 → テスト

- **ツールチェーン**:
  - openapi-typescript（型）
  - orval（fetchクライアント）
  - @redocly/cli（Lint/差分検出）
  - openapi-zod-client（Zodスキーマ生成, 必要に応じて）

- **検証**:
  - Route Handlers で Zod による入力/出力バリデーションを必須化
  - 生成クライアントでコントラクトテストを実施
  - エラーコードが定義ファイルと一致することをテストで保証

- **バージョニング**: SemVer。破壊的変更はメジャー＋deprecated 期間

- **公開**: Redoc/Scalar プレビューを任意で提供

---

## 9. 境界設計ポリシー（BFF/層分離と2モード）

### 9.1 層構造と依存方向

```
openapi/                 # 契約
packages/generated/      # 契約から生成された型/クライアント
packages/core/           # ドメイン/ユースケース（UI/HTTPに非依存）
packages/adapters/       # 環境依存（Supabase, Cache, Logger 等）
packages/bff/            # API I/O（契約 ←→ core）
apps/web/                # Next.js（UI と極薄API）
```

- **apps/web** は UI と薄い I/O のみ。ビジネスロジックは **bff** に置く。
- **core** は純粋関数。HTTP/Next を import しない。
- 依存方向は `web → bff → core` の一方向。ESLint でガード。

### 9.2 2モード切替

- `BACKEND_MODE=monolith|service` を導入。
  - monolith: `/api/*` は bff を直呼び（同一Worker内）
  - service: `/api/*` は 生成クライアントで外部サービス呼び出し（Hono/Go/Python 等）または Service Bindings

- 切替は **apiClient adapter** に集約。UI/core は無改修。

### 9.3 禁止事項

- `apps/web` から core を直接呼ばない
- core から Next.js や fetch 等を import しない
- Route Handlers 内にビジネスロジックを書かない（I/O変換＋Zod検証のみ）
- 外部 I/O は adapters に退避

### 9.4 CI/レビュー担保

- 依存方向リンターで層違反検出
- OpenAPI breaking change チェック
- コントラクトテストで型一致検証
- monolith/service 両モードでビルド・テスト

---

## 10. ローカル開発要件（Workers ローカル起動）

- **単一コマンド起動**: ローカルで **Workers を起動**し、フロント（`/`、`/home`）とバック（`/api/*`）を同一プロセスで動作確認できること。
  - 例: `wrangler dev` 相当。ホットリロード（UI/Route Handlers の変更が即時反映）。

- **実行モード切替**: 環境変数だけで `BACKEND_MODE=monolith|service` を切替可能。コード改変なしで両モード検証できること。

- **環境変数の取り回し**: ローカル専用の変数定義（例: `.dev.vars`）で以下を管理できること。
  - `SUPABASE_URL`, `SUPABASE_ANON_KEY`（未設定時は **モック/疎通スキップ** が選べる）
  - `BACKEND_BASE_URL`（service モード時の呼び先。未設定なら失敗が明示される）
  - `LOG_LEVEL`, `CHECK_SUPABASE`, `BACKEND_MODE`
  - `IMAGES_ACCOUNT_ID`, `IMAGES_API_TOKEN`（実APIを叩く場合）
  - `USE_IMAGES_MOCK`（`true` の場合はローカルで Images をモック）

- **OpenAPI 同期**: ローカル起動時に **契約→生成（型/クライアント）** を自動 or 事前に実行し、生成物のズレがあれば起動を警告/失敗にできること。

- **Zod 検証**: Route Handlers で **入力/出力の Zod バリデーション**が有効（開発時に型乖離を早期検知）。

- **ログ**: Workers Logs に準拠しつつ、ローカルは **pino-pretty** で出力。`requestId` を開発時にも付与。

- **CORS/同一オリジン**: ローカルは同一オリジン前提。必要に応じて `localhost` の複数ポートを許可できること。

### 10.1 KV / Queues / Images / D1 / Kiribi のローカル動作（要件）

- KV はローカルで利用可能であり、**プレビューID**の設定により本番IDと分離されていること。
- Queues のプロデューサ／コンシューマはローカルで起動し、**テストメッセージが処理**できること。
- **D1** はローカルでテーブル初期化・読み書きができ、Kiribi のジョブ永続テーブルが**起動時に準備**できること。
- **Kiribi** はローカルで利用可能（管理エンドポイント/UIの起動可否は設計側に委ねる）であり、ジョブ投入〜状態遷移を確認できること。
- Images は **実API**または**モック**のいずれかで検証可能であり、切替は**環境変数**で行えること。
- ローカル永続オプションにより、**再起動後も状態が保持**されること。

### 受け入れ基準（Local Dev）

- ***

  ***

## 11. 非同期画像処理（Queues × Images × D1 × Kiribi）— 要件

> 目的：ユーザがアップロードした画像を安全かつ安定に処理・配信するための**要件**を定義する（設計・実装は別ドキュメント）。

### 11.1 機能要件

- **アップロード開始は認証済みのホーム画面からのみ**行えること。
- 画像は**アップロードユーザのIDに紐付け**て管理すること（`userId` 必須）。
- アップロード直後にHTTP応答を返し、**非同期処理**に移行すること（重い処理は同期で行わない）。
- 画像は **Cloudflare Images** で保管し、**Variant** で配信解像度を切替可能とすること。
- 非同期処理（例：サムネイル生成・メタ付与）は **Cloudflare Queues** を用い、
  - **Kiribi** をジョブ管理レイヤとして採用し、
  - **D1** を用いてジョブメタ／進行状態／実行履歴を**永続化**できること（Kiribi の想定構成）。
- 進行状態は \`\` の単調増加で管理すること。
- ホーム画面には **当該ユーザに紐付く画像のみが一覧表示**されること（最新順、ページング/無限スクロールいずれか）。
- クライアントは状態を取得でき、`ready` になったら最終URL（variant）で表示できること。

### 11.2 非機能要件

- 配信は CDN 経由で行い、初回表示後はキャッシュされること。
- **少なくとも1回配信（at-least-once）** を前提に、処理は**冪等**であること（同一ジョブ重複実行で破綻しない）。
- **Kiribi + D1** によってジョブ状態が**永続化**され、**再実行・再試行の履歴**が追跡できること。
- メッセージは最小（参照ID中心）とし、**実データは Images/R2/Supabase** に保管すること。
- 失敗時は Kiribi/Queues の再試行ポリシーにより自動再試行し、上限到達時は **Dead Letter Queue**（DLQ）へ退避すること。
- 機微情報（トークン等）は Secrets 管理し、ログには出力しないこと。

### 11.3 運用要件

- **Kiribi 管理UI/エンドポイント**等により、ジョブ投入状況・再試行・失敗理由を可視化できること。
- DLQ 到達件数・エラー率は **Workers Logs/Logpush 先**で可視化し、閾値超過で通知されること。
- Variant 名称・ポリシー（例：`public`, `thumb`）は環境で一貫性を保つこと。
- 画像1件あたりの総処理時間（p95）目標を定めること（例：< 5 秒）。
- **削除要件**：ユーザが削除した場合、Images 側の資産と D1 上のジョブ/メタ状態を一致させて確実に消せること。

### 11.4 ローカル検証要件

- `wrangler dev` で **Queues/KV をローカルで動作**させ、状態遷移の確認ができること。
- Cloudflare Images は **実API**または**モック**のいずれでも検証可能であること（環境変数で切替）。
- ローカル永続（`--persist-to` 等）を用いて**再起動後も状態が再現**できること。

---

## 12. KV／Queues／Images — 共通要件（方針）

- **KV**：読み取り多・最終的整合向けに利用。キー設計（プレフィックス）と TTL を明示し、PII は保存しない。
- **Queues**：HTTPから重い処理を外出し。**冪等処理**・**DLQ監視**・**小さなメッセージ**・**バッチ処理**を原則とする。
- **Images**：原本保管と配信用URL（Variant）を分離。配信はCDN経由。アクセスポリシーとライフサイクル（削除・置換）を定義。

> 設計（エンドポイント設計、スキーマ、状態遷移図、リトライ戦略、エラー粒度、UI連携方式）は設計書で扱う。

---

## 13. 運用監視・運用ツール要件

### 13.1 観測性

- **リクエストトレース**：`requestId` / `traceId` を発行し全ログに付与すること（W3C TraceContext 準拠）。
- **ログ運用方針**：
  - 日常の観測は **Workers Logs** を用いること。
  - **Sentry Free** を併用し、**重大イベントのみ**転送すること（無料枠内運用）。
  - 重大度ポリシーを定義（例：HTTP 5xx、Queues の DLQ 到達、認証/ストレージの恒常失敗など）。
  - **サンプリング**：`error` は 100%、`warn` は条件付き、`info/debug` は送信しない。
  - **マスキング**：Sentry 送信前に PII/トークンを除去すること。
  - **タグ/コンテキスト**：`service/env/version/requestId/traceId/userId(ハッシュ)` を付与可能にすること。
- **OpenTelemetry 準拠方針**：
  - まずは **TraceContext の貫通**（`traceparent` 受継ぎ/発行）を必須とすること。
  - 将来 OTLP Exporter（HTTP/JSON など）を追加できるよう、**ベンダ非依存のフィールド/命名**を維持すること。

### 13.2 ヘルスチェック

- **エンドポイント分離**:
  - `/api/healthz`（liveness）：依存に触れない超軽量チェック。公開可。
  - `/api/readyz`（readiness）：Supabase/KV/Queues/Images の到達確認。内部利用。
  - `/api/diag`（diagnostics）：詳細診断（遅延、キュー滞留、容量）。認証必須。
- **レスポンス契約**：`status`／`dependencies`／`version`／`commit`／`buildTime` を必須フィールドとすること。
- **監視運用**：`/readyz` を監視系が 15〜60 秒ごとに叩き、失敗が閾値を超えたらアラートになること。

### 13.3 運用補助

- **管理ビュー**：ユーザ数、画像数、ジョブ滞留数を参照できる管理者向け簡易ダッシュボードを用意すること。
- **DLQ 監視**：Queues（Kiribi 経由を含む）のデッドレター件数を収集し、Workers Logs または外部監視サービスで通知できること。
- **監査ログ**：ユーザ操作（アップロード・削除）をサーバ側で記録し、検索できること。
- **ユーザサポート用ID体系**：画像IDやジョブIDをユーザに提示でき、問い合わせ対応に活用できること。

---

## 14. 推奨プラグイン／ツール

### 14.1 観測・運用

- `@sentry/nextjs` / `@sentry/worker`：重大イベントのみ送信し、タグを付与。
- `trace-context` または同等のユーティリティ：TraceContextを生成/継承。
- `@opentelemetry/api`：将来のExporter追加を見据え、最低限のAPIだけ導入。

### 14.2 API契約・スキーマ

- `openapi-typescript` / `orval` / `@redocly/cli`：契約→型/クライアント生成→差分Lint。
- `openapi-zod-client`：Zodによるランタイム検証を強化。

### 14.3 品質・静的解析

- `eslint` / `@typescript-eslint/*` / `eslint-config-next`
- `eslint-plugin-import` / `eslint-plugin-security` / `eslint-plugin-jsx-a11y`
- `prettier` / `prettier-plugin-tailwindcss`

### 14.4 テスト

- `vitest` / `@testing-library/react` / `@testing-library/jest-dom`
- `msw`：APIモックによる安定開発/テスト

### 14.5 Gitフロー／自動化

- `husky` + `lint-staged`
- `@commitlint/config-conventional` / `@commitlint/cli` または `changesets`

### 14.6 Next.js／React DX

- `next/bundle-analyzer`（開発用）
- `@vercel/og`（必要に応じてOG画像生成）

### 14.7 Cloudflare 周辺

- `wrangler`（必須）
- `kiribi`（Queues + D1 管理レイヤ）

### 14.8 型・環境

- `zod` + `@t3-oss/env-nextjs`：環境変数の型安全・バリデーション
- `ts-reset`（任意）

### 14.9 VS Code 拡張（任意）

- ESLint / Prettier / Tailwind CSS IntelliSense / GitLens / Error Lens
