'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function CallbackPage() {
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>(
    'processing'
  );
  const [message, setMessage] = useState('認証処理中...');
  const router = useRouter();

  useEffect(() => {
    // TODO: 実際のOAuth コールバック処理は後のタスクで実装
    // 現在はモック処理
    const processCallback = async () => {
      try {
        // 2秒待機してモック処理
        await new Promise((resolve) => setTimeout(resolve, 2000));

        // モック: 成功パターン
        setStatus('success');
        setMessage(
          'ログインに成功しました。ホームページにリダイレクトします...'
        );

        // 2秒後にホームページにリダイレクト
        setTimeout(() => {
          router.push('/home');
        }, 2000);
      } catch (error) {
        console.error('Callback processing failed:', error);
        setStatus('error');
        setMessage('認証処理に失敗しました。再度お試しください。');
      }
    };

    processCallback();
  }, [router]);

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
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
