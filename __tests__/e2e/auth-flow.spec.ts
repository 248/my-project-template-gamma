import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test.use({ storageState: { cookies: [], origins: [] } }); // 未認証状態でテスト

  test('complete auth flow: Top → Login → Home → Logout', async ({ page }) => {
    // 1. トップページにアクセス
    await page.goto('/');

    // 未認証状態でログインボタンが表示されることを確認
    const loginButton = page.getByRole('button', { name: /ログイン|login/i });
    await expect(loginButton).toBeVisible();

    // 2. ログインボタンをクリック
    await loginButton.click();

    // ログインページまたは認証プロバイダーにリダイレクトされることを確認
    await expect(page).toHaveURL(/\/auth\/login|github\.com|google\.com/);

    // モック認証の場合：直接ホームページにリダイレクト
    // 実際のOAuth の場合：認証プロバイダーでの認証後にコールバック
    if (page.url().includes('/auth/login')) {
      // モック認証フローをシミュレート
      await page.evaluate(() => {
        // モック認証成功後のリダイレクト
        window.location.href = '/auth/callback?code=mock-auth-code';
      });
    }

    // 3. 認証後にホームページにリダイレクト
    await expect(page).toHaveURL('/home');

    // ホームページの要素が表示されることを確認
    await expect(page.getByText(/ホーム|home/i)).toBeVisible();
    await expect(page.getByText(/ヘルスチェック|health check/i)).toBeVisible();

    // 4. ヘルスチェック機能をテスト
    const healthCheckButton = page.getByRole('button', {
      name: /ヘルスチェック実行|run health check/i,
    });
    await expect(healthCheckButton).toBeVisible();

    await healthCheckButton.click();

    // Loading状態の確認
    await expect(page.getByText(/loading|読み込み中/i)).toBeVisible();

    // ヘルスチェック結果の表示を確認
    await expect(
      page.getByText(/status.*ok|status.*degraded|status.*down/i)
    ).toBeVisible({ timeout: 10000 });

    // 5. 画像管理機能の確認
    const imageUploadSection = page.locator('[data-testid="image-upload"]');
    if (await imageUploadSection.isVisible()) {
      await expect(imageUploadSection).toBeVisible();

      // ファイル入力要素の確認
      const fileInput = page.locator('input[type="file"]');
      await expect(fileInput).toBeVisible();
    }

    // 6. ログアウト
    const logoutButton = page.getByRole('button', {
      name: /ログアウト|logout/i,
    });
    await expect(logoutButton).toBeVisible();

    await logoutButton.click();

    // トップページにリダイレクトされることを確認
    await expect(page).toHaveURL('/');

    // 再度ログインボタンが表示されることを確認（ログアウト成功）
    await expect(
      page.getByRole('button', { name: /ログイン|login/i })
    ).toBeVisible();
  });

  test('should redirect unauthenticated users from protected routes', async ({
    page,
  }) => {
    // 未認証状態で /home にアクセス
    await page.goto('/home');

    // トップページにリダイレクトされることを確認
    await expect(page).toHaveURL('/');

    // ログインボタンが表示されることを確認
    await expect(
      page.getByRole('button', { name: /ログイン|login/i })
    ).toBeVisible();
  });

  test('should handle authentication errors gracefully', async ({ page }) => {
    // 認証エラーをシミュレート
    await page.route('/api/auth/**', (route) => {
      route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({
          code: 'AUTH_REQUIRED',
          message: 'Authentication required',
        }),
      });
    });

    await page.goto('/');

    const loginButton = page.getByRole('button', { name: /ログイン|login/i });
    await loginButton.click();

    // エラーメッセージが表示されることを確認
    await expect(page.getByText(/error|エラー|認証に失敗/i)).toBeVisible({
      timeout: 5000,
    });
  });
});

test.describe('Authenticated User Experience', () => {
  // 認証済み状態でのテスト（setup で設定した認証状態を使用）

  test('should display home page for authenticated users', async ({ page }) => {
    await page.goto('/home');

    // ホームページが正常に表示されることを確認
    await expect(page.getByText(/ホーム|home/i)).toBeVisible();

    // 認証済みユーザー向けの機能が表示されることを確認
    await expect(page.getByText(/ヘルスチェック|health check/i)).toBeVisible();
  });

  test('should allow health check execution with loading states', async ({
    page,
  }) => {
    await page.goto('/home');

    const healthCheckButton = page.getByRole('button', {
      name: /ヘルスチェック実行|run health check/i,
    });
    await healthCheckButton.click();

    // Loading状態の確認
    await expect(page.getByText(/loading|読み込み中/i)).toBeVisible();

    // 結果の表示を待機
    await expect(page.getByText(/status/i)).toBeVisible({ timeout: 10000 });

    // 再試行ボタンが表示されることを確認
    const retryButton = page.getByRole('button', { name: /再試行|retry/i });
    if (await retryButton.isVisible()) {
      await retryButton.click();
      await expect(page.getByText(/loading|読み込み中/i)).toBeVisible();
    }
  });

  test('should handle image upload functionality', async ({ page }) => {
    await page.goto('/home');

    const imageUploadSection = page.locator('[data-testid="image-upload"]');

    if (await imageUploadSection.isVisible()) {
      // ファイル選択
      const fileInput = page.locator('input[type="file"]');

      // テスト用画像ファイルをアップロード
      await fileInput.setInputFiles('test-image.jpg');

      // アップロードボタンをクリック
      const uploadButton = page.getByRole('button', {
        name: /アップロード|upload/i,
      });
      if (await uploadButton.isVisible()) {
        await uploadButton.click();

        // アップロード中の状態を確認
        await expect(page.getByText(/uploading|アップロード中/i)).toBeVisible();

        // アップロード完了後の状態を確認
        await expect(page.getByText(/ready|完了/i)).toBeVisible({
          timeout: 15000,
        });
      }
    }
  });

  test('should display user images list', async ({ page }) => {
    await page.goto('/home');

    const imagesList = page.locator('[data-testid="images-list"]');

    if (await imagesList.isVisible()) {
      // 画像リストが表示されることを確認
      await expect(imagesList).toBeVisible();

      // 画像アイテムの確認
      const imageItems = imagesList.locator('[data-testid="image-item"]');
      const count = await imageItems.count();

      if (count > 0) {
        // 最初の画像アイテムの詳細を確認
        const firstImage = imageItems.first();
        await expect(firstImage).toBeVisible();

        // 画像の状態表示を確認
        await expect(
          firstImage.getByText(/ready|processing|uploading|failed/i)
        ).toBeVisible();
      }
    }
  });
});
