import { test as setup, expect } from '@playwright/test';

const authFile = 'playwright/.auth/user.json';

setup('authenticate', async ({ page }) => {
  // 認証セッションのセットアップ
  // 実際のOAuth フローの代わりにモックセッションを使用

  await page.goto('/');

  // ログインボタンが表示されることを確認
  await expect(
    page.getByRole('button', { name: /ログイン|login/i })
  ).toBeVisible();

  // モック認証のためのクッキーを設定
  // 実際の実装では、テスト用のOAuth プロバイダーまたはモックを使用
  await page.context().addCookies([
    {
      name: 'sb-access-token',
      value: 'mock-test-token-for-e2e',
      domain: 'localhost',
      path: '/',
      httpOnly: true,
      secure: false,
      sameSite: 'Lax',
    },
    {
      name: 'sb-refresh-token',
      value: 'mock-refresh-token-for-e2e',
      domain: 'localhost',
      path: '/',
      httpOnly: true,
      secure: false,
      sameSite: 'Lax',
    },
  ]);

  // 認証状態を保存
  await page.context().storageState({ path: authFile });
});
