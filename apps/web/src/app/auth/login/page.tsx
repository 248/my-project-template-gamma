'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useState, Suspense } from 'react';
import { clientLogger } from '@/lib/logger';

function LoginForm() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error');
  const redirect = searchParams.get('redirect');
  const [isLoading, setIsLoading] = useState<string | null>(null);

  const handleLogin = async () => {
    setIsLoading('google');

    try {
      // OAuth ログイン開始
      const loginUrl = new URL('/api/auth/login', window.location.origin);
      loginUrl.searchParams.set('provider', 'google');

      if (redirect) {
        loginUrl.searchParams.set('redirect', redirect);
      }

      window.location.href = loginUrl.toString();
    } catch (err) {
      clientLogger.error({ err }, 'Login initiation failed');
      setIsLoading(null);
    }
  };

  const getErrorMessage = (errorCode: string | null) => {
    switch (errorCode) {
      case 'missing_code':
        return '認証コードが見つかりません。再度お試しください。';
      case 'callback_failed':
        return '認証処理に失敗しました。再度お試しください。';
      case 'invalid_token':
        return 'セッションが無効です。再度ログインしてください。';
      default:
        return null;
    }
  };

  const errorMessage = getErrorMessage(error);

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-8rem)]">
      <div className="max-w-md w-full mx-auto">
        <div className="card">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">ログイン</h1>
            <p className="text-gray-600">
              {process.env.NODE_ENV === 'development' &&
              process.env.USE_MOCK_SUPABASE === 'true'
                ? 'モック認証でログインします'
                : 'Supabase OAuth認証でログインします'}
            </p>
          </div>

          {errorMessage && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
              <p className="text-red-700 text-sm">{errorMessage}</p>
            </div>
          )}

          {redirect && (
            <div className="mb-6 bg-blue-50 border border-blue-200 rounded-md p-4">
              <p className="text-blue-700 text-sm">
                ログイン後、元のページに戻ります
              </p>
            </div>
          )}

          {/* OAuth プロバイダー選択 */}
          <div className="space-y-4">
            <button
              onClick={handleLogin}
              disabled={isLoading !== null}
              className={`btn btn-primary w-full ${
                isLoading === 'google' ? 'loading' : ''
              }`}
            >
              {isLoading === 'google' ? (
                <span className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Google でログイン中...
                </span>
              ) : (
                'Google でログイン'
              )}
            </button>
          </div>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500">
              {process.env.NODE_ENV === 'development' &&
              process.env.USE_MOCK_SUPABASE === 'true'
                ? 'モック認証が有効です（開発環境）'
                : '安全なOAuth認証を使用しています'}
            </p>
          </div>

          <div className="mt-6 text-center">
            <Link
              href="/"
              className="text-sm text-blue-600 hover:text-blue-500"
            >
              トップページに戻る
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[calc(100vh-8rem)]">
          <div className="max-w-md w-full mx-auto">
            <div className="card text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">ページを読み込み中...</p>
            </div>
          </div>
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
