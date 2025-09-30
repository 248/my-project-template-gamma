# テスト戦略書

## 概要

Template Gammaプロジェクトのテスト戦略について説明します。テストピラミッドに基づいた3層のテスト構成により、品質保証と開発効率を両立しています。

## テスト戦略の原則

### 1. テストピラミッド

```
       E2E Tests (少数・重要フロー)
            ↑
     Integration Tests (API・認証)
            ↑
      Unit Tests (多数・高速)
```

- **単体テスト**: 高速・多数・詳細
- **統合テスト**: 中速・中数・API
- **E2Eテスト**: 低速・少数・重要フロー

### 2. テスト駆動開発（TDD）

1. **Red**: 失敗するテストを書く
2. **Green**: テストを通す最小限のコードを書く
3. **Refactor**: コードを改善する

### 3. 品質目標

- **テストカバレッジ**: 80%以上
- **テスト実行時間**: 3分以内
- **テスト成功率**: 95%以上
- **フレーク率**: 1%以下

## テスト構成

### ディレクトリ構造

```
__tests__/
├── unit/                   # 単体テスト
│   ├── core/              # Core層のテスト
│   ├── bff/               # BFF層のテスト
│   └── adapters/          # Adapter層のテスト
├── integration/           # 統合テスト
│   ├── api/               # APIエンドポイントテスト
│   └── auth/              # 認証フローテスト
├── e2e/                   # E2Eテスト
│   ├── auth-flow.spec.ts  # 認証フローテスト
│   └── health.spec.ts     # ヘルスチェックテスト
└── utils/                 # テストユーティリティ
    ├── mocks.ts           # モック定義
    ├── fixtures.ts        # テストデータ
    └── test-client.ts     # テスト用APIクライアント
```

### テストツール

| 層         | ツール       | 用途                  |
| ---------- | ------------ | --------------------- |
| 単体テスト | Vitest       | 高速なユニットテスト  |
| 統合テスト | Vitest + MSW | APIモック・統合テスト |
| E2Eテスト  | Playwright   | ブラウザ自動化テスト  |
| モック     | MSW v2       | HTTPリクエストモック  |

## 単体テスト（Unit Tests）

### 対象とスコープ

#### Core層のテスト

**対象**: 純粋関数・ビジネスロジック

```typescript
// __tests__/unit/core/user.test.ts
import { describe, it, expect } from 'vitest';
import { updateLastLogin } from '@template-gamma/core';

describe('updateLastLogin', () => {
  it('should update last login time', () => {
    const user = {
      id: 'user-123',
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
      lastLoginAt: new Date('2024-01-01'),
    };

    const result = updateLastLogin(user);

    expect(result.lastLoginAt).toBeInstanceOf(Date);
    expect(result.lastLoginAt.getTime()).toBeGreaterThan(
      user.lastLoginAt.getTime()
    );
    expect(result.updatedAt).toBeInstanceOf(Date);
  });

  it('should preserve other user properties', () => {
    const user = {
      id: 'user-123',
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
      lastLoginAt: new Date('2024-01-01'),
    };

    const result = updateLastLogin(user);

    expect(result.id).toBe(user.id);
    expect(result.createdAt).toBe(user.createdAt);
  });
});
```

#### BFF層のテスト

**対象**: サービス層・ビジネスファサード

```typescript
// __tests__/unit/bff/health-service.test.ts
import { describe, it, expect, vi } from 'vitest';
import { HealthServiceImpl } from '@template-gamma/bff';
import {
  mockSupabaseAdapter,
  mockStorageAdapter,
  mockLogger,
} from '../../utils/mocks';

describe('HealthServiceImpl', () => {
  it('should return ok status when all dependencies are healthy', async () => {
    mockSupabaseAdapter.ping.mockResolvedValue(true);
    mockStorageAdapter.ping.mockResolvedValue(true);

    const service = new HealthServiceImpl(
      mockSupabaseAdapter,
      mockStorageAdapter,
      mockLogger
    );

    const result = await service.checkReadiness();

    expect(result.status).toBe('ok');
    expect(result.dependencies).toHaveLength(2);
    expect(result.dependencies[0].status).toBe('ok');
    expect(result.dependencies[1].status).toBe('ok');
  });

  it('should return degraded status when some dependencies fail', async () => {
    mockSupabaseAdapter.ping.mockResolvedValue(true);
    mockStorageAdapter.ping.mockResolvedValue(false);

    const service = new HealthServiceImpl(
      mockSupabaseAdapter,
      mockStorageAdapter,
      mockLogger
    );

    const result = await service.checkReadiness();

    expect(result.status).toBe('degraded');
    expect(result.dependencies[0].status).toBe('ok');
    expect(result.dependencies[1].status).toBe('down');
  });
});
```

#### Adapters層のテスト

**対象**: 外部サービスアダプター

```typescript
// __tests__/unit/adapters/supabase-adapter.test.ts
import { describe, it, expect, vi } from 'vitest';
import { SupabaseAdapterImpl } from '@template-gamma/adapters';

// Supabaseクライアントのモック
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        limit: vi.fn(() => ({
          then: vi.fn(),
        })),
      })),
    })),
  })),
}));

describe('SupabaseAdapterImpl', () => {
  it('should return true when ping succeeds', async () => {
    const adapter = new SupabaseAdapterImpl({
      url: 'test-url',
      serviceRoleKey: 'test-key',
    });

    const result = await adapter.ping();

    expect(result).toBe(true);
  });
});
```

### 実行コマンド

```bash
# 単体テスト実行
pnpm test:unit

# 監視モード
pnpm test:watch

# カバレッジ付き実行
pnpm test:unit --coverage

# 特定ファイルのテスト
pnpm test:unit user.test.ts

# テストUI
pnpm test:ui
```

## 統合テスト（Integration Tests）

### 対象とスコープ

#### APIエンドポイントテスト

**対象**: Route Handlers・API契約

```typescript
// __tests__/integration/api/health.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { testClient } from '../../utils/test-client';
import { server } from '../../utils/mocks';

describe('/api/readyz', () => {
  beforeAll(() => server.listen());
  afterAll(() => server.close());

  it('should return readiness status', async () => {
    const response = await testClient.get('/api/readyz');

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      status: expect.stringMatching(/^(ok|degraded|down)$/),
      dependencies: expect.arrayContaining([
        expect.objectContaining({
          name: expect.any(String),
          status: expect.stringMatching(/^(ok|degraded|down)$/),
        }),
      ]),
      version: expect.any(String),
      commit: expect.any(String),
      buildTime: expect.any(String),
    });
  });

  it('should include latency information', async () => {
    const response = await testClient.get('/api/readyz');

    expect(response.body.dependencies).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          latency: expect.any(Number),
        }),
      ])
    );
  });
});
```

#### バリデーションテスト

**対象**: 入力値検証・エラーハンドリング

```typescript
// __tests__/integration/api/validation.test.ts
import { describe, it, expect } from 'vitest';
import { testClient } from '../../utils/test-client';

describe('API Validation', () => {
  describe('POST /api/images', () => {
    it('should return 422 for missing file', async () => {
      const response = await testClient.post('/api/images', {});

      expect(response.status).toBe(422);
      expect(response.body).toMatchObject({
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: {
          issues: expect.arrayContaining([
            expect.objectContaining({
              path: ['file'],
              message: expect.stringContaining('required'),
            }),
          ]),
        },
      });
    });

    it('should return 422 for invalid file type', async () => {
      const invalidFile = new File(['content'], 'test.txt', {
        type: 'text/plain',
      });

      const response = await testClient.post('/api/images', {
        file: invalidFile,
      });

      expect(response.status).toBe(422);
      expect(response.body.code).toBe('UNSUPPORTED_FILE_TYPE');
    });

    it('should return 422 for file too large', async () => {
      const largeFile = new File(['x'.repeat(11 * 1024 * 1024)], 'large.jpg', {
        type: 'image/jpeg',
      });

      const response = await testClient.post('/api/images', {
        file: largeFile,
      });

      expect(response.status).toBe(422);
      expect(response.body.code).toBe('FILE_TOO_LARGE');
    });
  });
});
```

### MSWによるモック

```typescript
// __tests__/utils/mocks.ts
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';

export const server = setupServer(
  // Supabase Auth モック
  http.post('https://your-project.supabase.co/auth/v1/token', () => {
    return HttpResponse.json({
      access_token: 'mock-access-token',
      refresh_token: 'mock-refresh-token',
      user: {
        id: 'mock-user-id',
        email: 'test@example.com',
      },
    });
  }),

  // Supabase Database モック
  http.get('https://your-project.supabase.co/rest/v1/app_users', () => {
    return HttpResponse.json([
      {
        id: 'mock-user-id',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        last_login_at: '2024-01-01T00:00:00Z',
      },
    ]);
  }),

  // ヘルスチェック モック
  http.get('/api/readyz', () => {
    return HttpResponse.json({
      status: 'ok',
      dependencies: [
        { name: 'supabase', status: 'ok', latency: 45 },
        { name: 'storage', status: 'ok', latency: 23 },
      ],
      version: '1.0.0',
      commit: 'abc123',
      buildTime: '2024-01-01T00:00:00Z',
    });
  })
);
```

### 実行コマンド

```bash
# 統合テスト実行
pnpm test:integration

# 特定のAPIテスト
pnpm test:integration api/health

# デバッグモード
pnpm test:integration --reporter=verbose
```

## E2Eテスト（End-to-End Tests）

### 対象とスコープ

#### 認証フローテスト

**対象**: ユーザーの主要フロー

```typescript
// __tests__/e2e/auth-flow.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test('complete auth flow: Top → Login → Home → Logout', async ({ page }) => {
    // トップページ
    await page.goto('/');
    await expect(page.getByRole('button', { name: 'ログイン' })).toBeVisible();

    // ログイン
    await page.getByRole('button', { name: 'ログイン' }).click();

    // OAuth認証（モック）
    await page.waitForURL('/home');

    // ホームページ
    await expect(page.getByText('ヘルスチェック実行')).toBeVisible();
    await expect(page.getByText('画像アップロード')).toBeVisible();

    // ヘルスチェック実行
    await page.getByRole('button', { name: 'ヘルスチェック実行' }).click();
    await expect(page.getByText(/Status: (ok|degraded|down)/)).toBeVisible();

    // ログアウト
    await page.getByRole('button', { name: 'ログアウト' }).click();
    await expect(page).toHaveURL('/');
    await expect(page.getByRole('button', { name: 'ログイン' })).toBeVisible();
  });

  test('should redirect unauthenticated users from protected pages', async ({
    page,
  }) => {
    await page.goto('/home');
    await expect(page).toHaveURL('/');
  });
});
```

#### 画像管理テスト

```typescript
// __tests__/e2e/image-management.spec.ts
import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('Image Management', () => {
  test.beforeEach(async ({ page }) => {
    // 認証済み状態でテスト開始
    await page.goto('/home');
  });

  test('should upload and display image', async ({ page }) => {
    const fileInput = page.getByRole('button', { name: '画像を選択' });

    // ファイル選択
    await fileInput.setInputFiles(
      path.join(__dirname, '../fixtures/test-image.jpg')
    );

    // アップロード実行
    await page.getByRole('button', { name: 'アップロード' }).click();

    // アップロード完了を待機
    await expect(page.getByText('アップロード完了')).toBeVisible();

    // 画像一覧に表示されることを確認
    await expect(page.getByAltText('test-image.jpg')).toBeVisible();
  });

  test('should show error for invalid file type', async ({ page }) => {
    const fileInput = page.getByRole('button', { name: '画像を選択' });

    // 無効なファイル選択
    await fileInput.setInputFiles(
      path.join(__dirname, '../fixtures/test-document.pdf')
    );

    // エラーメッセージ表示
    await expect(
      page.getByText('サポートされていないファイル形式です')
    ).toBeVisible();
  });
});
```

### 認証セッション管理

```typescript
// __tests__/e2e/auth.setup.ts
import { test as setup, expect } from '@playwright/test';

const authFile = 'playwright/.auth/user.json';

setup('authenticate', async ({ page }) => {
  // ログインページに移動
  await page.goto('/auth/login');

  // OAuth認証（テスト用の簡略化フロー）
  await page.getByRole('button', { name: 'Google でログイン' }).click();

  // 認証完了を待機
  await page.waitForURL('/home');
  await expect(page.getByText('ホーム')).toBeVisible();

  // 認証状態を保存
  await page.context().storageState({ path: authFile });
});
```

### Playwright設定

```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: '__tests__/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',

  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
    },
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'playwright/.auth/user.json',
      },
      dependencies: ['setup'],
    },
    {
      name: 'firefox',
      use: {
        ...devices['Desktop Firefox'],
        storageState: 'playwright/.auth/user.json',
      },
      dependencies: ['setup'],
    },
  ],

  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
```

### 実行コマンド

```bash
# E2Eテスト実行
pnpm test:e2e

# ヘッドレスモードで実行
pnpm test:e2e --headed

# 特定のブラウザで実行
pnpm test:e2e --project=chromium

# デバッグモード
pnpm test:e2e --debug

# テストUI
pnpm test:e2e:ui
```

## バックエンドモード別テスト

### モード切替テスト

```bash
# モノリスモードでテスト
BACKEND_MODE=monolith pnpm test:all

# サービスモードでテスト
BACKEND_MODE=service pnpm test:all

# 両モードでテスト
pnpm test:mode
```

### モード別テスト設定

```typescript
// __tests__/utils/mode-factory.test.ts
import { describe, it, expect } from 'vitest';
import { ServiceFactory } from '@/packages/bff/mode-factory';

describe('ServiceFactory', () => {
  it('should create monolith services when BACKEND_MODE=monolith', () => {
    process.env.BACKEND_MODE = 'monolith';

    const services = ServiceFactory.create();

    expect(services).toBeInstanceOf(MonolithServices);
  });

  it('should create external client when BACKEND_MODE=service', () => {
    process.env.BACKEND_MODE = 'service';

    const services = ServiceFactory.create();

    expect(services).toBeInstanceOf(ExternalServiceClient);
  });
});
```

## モック戦略

### モックの種類と使い分け

| モック種類         | 用途       | ツール         |
| ------------------ | ---------- | -------------- |
| 関数モック         | 単体テスト | Vitest vi.fn() |
| HTTPモック         | 統合テスト | MSW            |
| ブラウザモック     | E2Eテスト  | Playwright     |
| データベースモック | 統合テスト | インメモリDB   |

### モック実装例

```typescript
// __tests__/utils/mocks.ts
import { vi } from 'vitest';

// Supabaseアダプターのモック
export const mockSupabaseAdapter = {
  ping: vi.fn().mockResolvedValue(true),
  createUser: vi.fn().mockResolvedValue({
    id: 'mock-user-id',
    createdAt: new Date(),
    updatedAt: new Date(),
    lastLoginAt: new Date(),
  }),
  updateLastLogin: vi.fn().mockResolvedValue(undefined),
  getCurrentUser: vi.fn().mockResolvedValue(null),
};

// ストレージアダプターのモック
export const mockStorageAdapter = {
  ping: vi.fn().mockResolvedValue(true),
  uploadFile: vi.fn().mockResolvedValue('mock-file-url'),
  getSignedUrl: vi.fn().mockResolvedValue('mock-signed-url'),
  deleteFile: vi.fn().mockResolvedValue(undefined),
};

// ログガーのモック
export const mockLogger = {
  info: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  debug: vi.fn(),
};
```

## テストデータ管理

### フィクスチャ

```typescript
// __tests__/utils/fixtures.ts
export const userFixtures = {
  validUser: {
    id: 'user-123',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    lastLoginAt: new Date('2024-01-01'),
  },

  newUser: {
    id: 'user-456',
    createdAt: new Date(),
    updatedAt: new Date(),
    lastLoginAt: new Date(),
  },
};

export const imageFixtures = {
  validImage: {
    id: 'image-123',
    userId: 'user-123',
    filename: 'test.jpg',
    status: 'ready' as const,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },

  uploadingImage: {
    id: 'image-456',
    userId: 'user-123',
    filename: 'uploading.jpg',
    status: 'uploading' as const,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
};
```

### テストファイル

```
__tests__/fixtures/
├── test-image.jpg          # 有効な画像ファイル
├── test-image-large.jpg    # サイズ制限テスト用
├── test-document.pdf       # 無効なファイル形式
└── test-data.json         # テスト用JSONデータ
```

## CI/CDでのテスト実行

### GitHub Actions設定

```yaml
# .github/workflows/test.yml
name: Test

on: [push, pull_request]

jobs:
  unit-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'

      - name: Install dependencies
        run: corepack enable && pnpm install --frozen-lockfile

      - name: Run unit tests
        run: pnpm test:unit --coverage

      - name: Upload coverage
        uses: codecov/codecov-action@v3

  integration-test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        backend-mode: [monolith, service]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'

      - name: Install dependencies
        run: corepack enable && pnpm install --frozen-lockfile

      - name: Run integration tests
        env:
          BACKEND_MODE: ${{ matrix.backend-mode }}
        run: pnpm test:integration

  e2e-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'

      - name: Install dependencies
        run: corepack enable && pnpm install --frozen-lockfile

      - name: Install Playwright
        run: npx playwright install --with-deps

      - name: Run E2E tests
        run: pnpm test:e2e

      - name: Upload test results
        uses: actions/upload-artifact@v3
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/
```

## パフォーマンステスト

### 負荷テスト

```typescript
// __tests__/performance/load.test.ts
import { describe, it, expect } from 'vitest';
import { testClient } from '../utils/test-client';

describe('Performance Tests', () => {
  it('should handle concurrent health checks', async () => {
    const startTime = Date.now();

    // 100並列リクエスト
    const promises = Array.from({ length: 100 }, () =>
      testClient.get('/api/readyz')
    );

    const responses = await Promise.all(promises);
    const endTime = Date.now();

    // 全リクエストが成功
    responses.forEach((response) => {
      expect(response.status).toBe(200);
    });

    // p95 < 300ms の目標
    const duration = endTime - startTime;
    expect(duration).toBeLessThan(30000); // 30秒以内
  });
});
```

## テスト品質管理

### カバレッジ目標

```json
{
  "coverage": {
    "lines": 80,
    "functions": 80,
    "branches": 75,
    "statements": 80
  }
}
```

### 品質メトリクス

- **テスト成功率**: 95%以上
- **フレーク率**: 1%以下
- **実行時間**: 3分以内
- **カバレッジ**: 80%以上

## トラブルシューティング

### よくある問題

#### 1. テストの不安定性（フレーク）

```typescript
// 解決方法: 適切な待機処理
await page.waitForSelector('[data-testid="loading"]', { state: 'hidden' });
await expect(page.getByText('完了')).toBeVisible();
```

#### 2. モックの設定ミス

```typescript
// 解決方法: beforeEach でモックリセット
beforeEach(() => {
  vi.clearAllMocks();
});
```

#### 3. 非同期処理のテスト

```typescript
// 解決方法: async/await の適切な使用
await expect(async () => {
  const result = await service.processAsync();
  return result;
}).resolves.toBeDefined();
```

## まとめ

Template Gammaのテスト戦略は以下の特徴を持ちます：

- **包括性**: 単体・統合・E2Eの3層構成
- **効率性**: 高速な実行と適切なモック
- **信頼性**: 安定したテストと品質管理
- **保守性**: 明確な構造と再利用可能なユーティリティ
- **自動化**: CI/CDでの自動実行
- **観測性**: カバレッジとメトリクスの監視

適切なテスト戦略により、品質保証と開発効率を両立し、継続的な改善が可能になります。
