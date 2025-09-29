'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { clientLogger } from '@/lib/logger';

function CallbackProcessor() {
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>(
    'processing'
  );
  const [message, setMessage] = useState('認証処理中...');
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const processCallback = async () => {
      try {
        const code = searchParams.get('code');
        const provider = searchParams.get('provider') || 'github';
        const redirect = searchParams.get('redirect');

        if (!code) {
          setStatus('error');
          setMessage('認証コードが見つかりません。');
          return;
        }

        setMessage(`${provider} 認証を処理中...`);

        // コールバック処理APIを呼び出し
        const callbackUrl = new URL(
          '/api/auth/callback',
          window.location.origin
        );
        callbackUrl.searchParams.set('code', code);
        callbackUrl.searchParams.set('provider', provider);

        const response = await fetch(callbackUrl.toString(), {
          method: 'GET',
          credentials: 'include',
        });

        if (response.redirected) {
          // リダイレクトされた場合（成功）
          setStatus('success');
          setMessage('ログインに成功しました。リダイレクトします...');

          // リダイレクト先を決定
          const redirectUrl = redirect || '/home';

          setTimeout(() => {
            router.push(redirectUrl);
          }, 1500);
        } else if (!response.ok) {
          throw new Error(`Callback failed: ${response.status}`);
        }
      } catch (error) {
        clientLogger.error({ err: error }, 'Callback processing failed');
        setStatus('error');
        setMessage('認証処理に失敗しました。再度お試しください。');
      }
    };

    processCallback();
  }, [router, searchParams]);

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-8rem)]">
      <div className="max-w-md w-full mx-auto">
        <div className="card text-center">
          <div className="mb-6">
            {status === 'processing' && (
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            )}

            {status === 'success' && (
              <div className="text-green-600 text-4xl mb-4">✅</div>
            )}

            {status === 'error' && (
              <div className="text-red-600 text-4xl mb-4">❌</div>
            )}

            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              {status === 'processing' && '認証処理中'}
              {status === 'success' && '認証成功'}
              {status === 'error' && '認証エラー'}
            </h1>

            <p className="text-gray-600">{message}</p>
          </div>

          {status === 'error' && (
            <div className="space-y-4">
              <Link href="/auth/login" className="btn btn-primary w-full">
                ログインページに戻る
              </Link>

              <Link href="/" className="btn btn-secondary w-full">
                トップページに戻る
              </Link>
            </div>
          )}

          {status === 'processing' && (
            <div className="text-sm text-gray-500">
              <p>しばらくお待ちください...</p>
              <p className="mt-2">
                {process.env.NODE_ENV === 'development' &&
                  process.env.USE_MOCK_SUPABASE === 'true' &&
                  'モック認証処理中...'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function CallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[calc(100vh-8rem)]">
          <div className="max-w-md w-full mx-auto">
            <div className="card text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">認証処理を準備中...</p>
            </div>
          </div>
        </div>
      }
    >
      <CallbackProcessor />
    </Suspense>
  );
}
