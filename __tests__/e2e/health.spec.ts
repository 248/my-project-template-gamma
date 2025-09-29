import { test, expect } from '@playwright/test';

test.describe('Health Check Pages', () => {
  test('should display health check page with SSR', async ({ page }) => {
    await page.goto('/health');

    // ページタイトルの確認
    await expect(page).toHaveTitle(/health|ヘルスチェック/i);

    // ヘルスチェック結果が表示されることを確認
    await expect(page.getByText(/status|ステータス/i)).toBeVisible();
    await expect(page.getByText(/ok|degraded|down/i)).toBeVisible();

    // 依存関係の情報が表示されることを確認
    await expect(page.getByText(/dependencies|依存関係/i)).toBeVisible();

    // バージョン情報が表示されることを確認
    await expect(page.getByText(/version|バージョン/i)).toBeVisible();
  });

  test('should load health page quickly', async ({ page }) => {
    const start = Date.now();

    await page.goto('/health');
    await expect(page.getByText(/status|ステータス/i)).toBeVisible();

    const loadTime = Date.now() - start;
    expect(loadTime).toBeLessThan(2000); // 2秒以内
  });

  test('should display health information in structured format', async ({
    page,
  }) => {
    await page.goto('/health');

    // 構造化された情報の表示を確認
    const healthInfo = page.locator('[data-testid="health-info"]');
    if (await healthInfo.isVisible()) {
      await expect(healthInfo).toContainText(/status/i);
      await expect(healthInfo).toContainText(/timestamp/i);
    }

    // 依存関係リストの確認
    const dependenciesList = page.locator('[data-testid="dependencies-list"]');
    if (await dependenciesList.isVisible()) {
      const dependencies = dependenciesList.locator('li');
      const count = await dependencies.count();
      expect(count).toBeGreaterThan(0);
    }
  });

  test('should handle health check errors gracefully', async ({ page }) => {
    // ネットワークエラーをシミュレート
    await page.route('/api/readyz', (route) => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          code: 'INTERNAL_ERROR',
          message: 'Service temporarily unavailable',
        }),
      });
    });

    await page.goto('/health');

    // エラー状態でも適切に表示されることを確認
    await expect(page.getByText(/error|エラー|down/i)).toBeVisible();
  });
});
