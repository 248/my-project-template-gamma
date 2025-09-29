// Vitest setup file
import { beforeAll, afterEach, afterAll } from 'vitest';

beforeAll(async () => {
  // MSW サーバーを開始（動的インポート）
  const { server } = await import('../__tests__/utils/mocks');
  server.listen({ onUnhandledRequest: 'warn' });

  // テスト環境変数の設定
  process.env.NODE_ENV = 'test';
  process.env.APP_VERSION = '1.0.0-test';
  process.env.GIT_COMMIT = 'test-commit';
  process.env.BUILD_TIME = '2024-01-01T00:00:00Z';
  process.env.BACKEND_MODE = 'monolith';

  // Supabase モック設定
  process.env.SUPABASE_URL = 'https://test.supabase.co';
  process.env.SUPABASE_ANON_KEY = 'test-anon-key';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';

  // ログレベル設定
  process.env.LOG_LEVEL = 'error'; // テスト中はエラーのみ
});

afterEach(async () => {
  // 各テスト後にハンドラーをリセット
  const { server } = await import('../__tests__/utils/mocks');
  server.resetHandlers();
});

afterAll(async () => {
  // MSW サーバーを停止
  const { server } = await import('../__tests__/utils/mocks');
  server.close();
});
