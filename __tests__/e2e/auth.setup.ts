import { test as setup, expect } from '@playwright/test';

const authFile = 'playwright/.auth/user.json';

setup('authenticate', async ({ page }) => {
  // モック認証を使用してログイン
  await page.goto('/');

  // ログインボタンをクリック
  const loginButton = page.getByRole('button', { name: /ログイン|login/i });
  await expect(loginButton).toBeVisible();
  await loginButton.click();

  // モック認証の場合、直接コールバックページに移動
  if (process.env.USE_MOCK_SUPABASE === 'true') {
    await page.goto('/auth/callback?code=mock-auth-code&provider=google');
  }

  // ホームページにリダイレクトされることを確認
  await expect(page).toHaveURL('/home');

  // 認証状態を保存
  await page.context().storageState({ path: authFile });
});
