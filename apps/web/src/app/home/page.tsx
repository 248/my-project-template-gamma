'use client';

import { useState } from 'react';
import Link from 'next/link';
import { logout } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import ImageManagement from '@/components/ImageManagement';

// ログアウトボタンコンポーネント
function LogoutButton() {
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const router = useRouter();

  const handleLogout = async () => {
    setIsLoggingOut(true);

    try {
      const success = await logout();

      if (success) {
        router.push('/');
      } else {
        alert('ログアウトに失敗しました。再度お試しください。');
      }
    } catch (error) {
      console.error('Logout error:', error);
      alert('ログアウトに失敗しました。再度お試しください。');
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <button
      onClick={handleLogout}
      disabled={isLoggingOut}
      className={`btn btn-danger ${isLoggingOut ? 'loading' : ''}`}
    >
      {isLoggingOut ? (
        <span className="flex items-center">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
          ログアウト中...
        </span>
      ) : (
        'ログアウト'
      )}
    </button>
  );
}

export default function HomePage() {
  const [healthStatus, setHealthStatus] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleHealthCheck = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // TODO: 実際のAPI呼び出しは後のタスクで実装
      // 現在はモックレスポンス
      await new Promise((resolve) => setTimeout(resolve, 1000)); // 1秒待機

      const mockResponse = {
        status: 'ok',
        dependencies: [
          { name: 'supabase', status: 'ok', latency: 45 },
          { name: 'storage', status: 'ok', latency: 32 },
        ],
        version: '1.0.0',
        commit: 'abc123',
        buildTime: new Date().toISOString(),
        timestamp: new Date().toISOString(),
      };

      setHealthStatus(mockResponse);
    } catch (err) {
      setError('ヘルスチェックに失敗しました');
      console.error('Health check failed:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRetry = () => {
    handleHealthCheck();
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">ホーム</h1>
        <p className="text-gray-600">
          認証済みユーザー向けのダッシュボードです
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* ヘルスチェックセクション */}
        <div className="card">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            システム状態確認
          </h2>
          <p className="text-gray-600 mb-4">
            バックエンドサービスの状態を確認できます
          </p>

          <div className="space-y-4">
            <button
              onClick={handleHealthCheck}
              disabled={isLoading}
              className={`btn btn-primary w-full ${isLoading ? 'loading' : ''}`}
            >
              {isLoading ? 'チェック中...' : 'ヘルスチェック実行'}
            </button>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-4">
                <div className="flex items-center justify-between">
                  <p className="error-message">{error}</p>
                  <button
                    onClick={handleRetry}
                    className="btn btn-secondary text-sm"
                  >
                    再試行
                  </button>
                </div>
              </div>
            )}

            {healthStatus && (
              <div className="bg-green-50 border border-green-200 rounded-md p-4">
                <h3 className="font-medium text-green-900 mb-2">
                  Status: {healthStatus.status}
                </h3>
                <div className="text-sm text-green-700 space-y-1">
                  <p>Version: {healthStatus.version}</p>
                  <p>Commit: {healthStatus.commit}</p>
                  <p>
                    Build Time:{' '}
                    {new Date(healthStatus.buildTime).toLocaleString('ja-JP')}
                  </p>

                  {healthStatus.dependencies && (
                    <div className="mt-3">
                      <p className="font-medium">Dependencies:</p>
                      <ul className="ml-4 space-y-1">
                        {healthStatus.dependencies.map(
                          (dep: any, index: number) => (
                            <li
                              key={index}
                              className="flex items-center space-x-2"
                            >
                              <span
                                className={`w-2 h-2 rounded-full ${
                                  dep.status === 'ok'
                                    ? 'bg-green-500'
                                    : dep.status === 'degraded'
                                      ? 'bg-yellow-500'
                                      : 'bg-red-500'
                                }`}
                              ></span>
                              <span>
                                {dep.name}: {dep.status}
                              </span>
                              {dep.latency && <span>({dep.latency}ms)</span>}
                            </li>
                          )
                        )}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 画像管理セクション */}
        <div className="card">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">画像管理</h2>
          <p className="text-gray-600 mb-4">
            画像のアップロードと管理ができます
          </p>

          <ImageManagement />
        </div>
      </div>

      {/* ナビゲーション */}
      <div className="mt-8 flex justify-between items-center">
        <Link href="/" className="btn btn-secondary">
          トップページに戻る
        </Link>

        <LogoutButton />
      </div>
    </div>
  );
}
