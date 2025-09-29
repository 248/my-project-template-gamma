/**
 * 認証関連のヘルパー関数
 */

export interface User {
  id: string;
  email?: string;
  lastLoginAt?: string;
}

/**
 * クライアントサイド用の認証状態チェック
 */
export async function checkAuthStatus(): Promise<{
  user: User | null;
  isAuthenticated: boolean;
}> {
  try {
    const response = await fetch('/api/auth/me', {
      method: 'GET',
      credentials: 'include',
    });

    if (response.ok) {
      const data = await response.json();
      return {
        user: data.user,
        isAuthenticated: true,
      };
    }

    return {
      user: null,
      isAuthenticated: false,
    };
  } catch (error) {
    console.error('Auth status check failed:', error);
    return {
      user: null,
      isAuthenticated: false,
    };
  }
}

/**
 * ログアウト処理
 */
export async function logout(): Promise<boolean> {
  try {
    const response = await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include',
    });

    return response.ok;
  } catch (error) {
    console.error('Logout failed:', error);
    return false;
  }
}
