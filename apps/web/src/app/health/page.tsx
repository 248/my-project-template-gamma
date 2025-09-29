import Link from 'next/link';
import RefreshButton from '@/components/RefreshButton';

// サーバーサイドでヘルスチェックを実行
async function getHealthStatus() {
  try {
    // モック実装：実際のヘルスチェックロジック
    await new Promise((resolve) => setTimeout(resolve, 100)); // 100ms待機

    return {
      status: 'ok' as const,
      dependencies: [
        { name: 'supabase', status: 'ok' as const, latency: 45 },
        { name: 'storage', status: 'ok' as const, latency: 32 },
      ],
      version: process.env.APP_VERSION || '1.0.0',
      commit: process.env.GIT_COMMIT || 'dev',
      buildTime: process.env.BUILD_TIME || new Date().toISOString(),
      timestamp: new Date().toISOString(),
      checkTime: new Date().toISOString(),
    };
  } catch (error) {
    console.error('Health check failed:', error);
    return {
      status: 'down' as const,
      dependencies: [
        {
          name: 'supabase',
          status: 'down' as const,
          error: 'Connection failed',
        },
        {
          name: 'storage',
          status: 'down' as const,
          error: 'Connection failed',
        },
      ],
      version: process.env.APP_VERSION || '1.0.0',
      commit: process.env.GIT_COMMIT || 'dev',
      buildTime: process.env.BUILD_TIME || new Date().toISOString(),
      timestamp: new Date().toISOString(),
      checkTime: new Date().toISOString(),
      error: 'System health check failed',
    };
  }
}

export default async function HealthPage() {
  const healthStatus = await getHealthStatus();

  const statusColor = {
    ok: 'text-green-600 bg-green-50 border-green-200',
    degraded: 'text-yellow-600 bg-yellow-50 border-yellow-200',
    down: 'text-red-600 bg-red-50 border-red-200',
  }[healthStatus.status];

  const statusIcon = {
    ok: '✅',
    degraded: '⚠️',
    down: '❌',
  }[healthStatus.status];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          システム状態確認
        </h1>
        <p className="text-gray-600">
          サーバーサイドで実行されたヘルスチェック結果
        </p>
      </div>

      {/* 全体ステータス */}
      <div className={`card border-2 ${statusColor} mb-6`}>
        <div className="flex items-center space-x-3 mb-4">
          <span className="text-2xl">{statusIcon}</span>
          <h2 className="text-2xl font-bold capitalize">
            Status: {healthStatus.status}
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <p>
              <strong>Version:</strong> {healthStatus.version}
            </p>
            <p>
              <strong>Commit:</strong> {healthStatus.commit}
            </p>
          </div>
          <div>
            <p>
              <strong>Build Time:</strong>{' '}
              {new Date(healthStatus.buildTime).toLocaleString('ja-JP')}
            </p>
            <p>
              <strong>Check Time:</strong>{' '}
              {new Date(healthStatus.checkTime).toLocaleString('ja-JP')}
            </p>
          </div>
        </div>

        {healthStatus.error && (
          <div className="mt-4 p-3 bg-red-100 border border-red-300 rounded">
            <p className="text-red-700 font-medium">
              Error: {healthStatus.error}
            </p>
          </div>
        )}
      </div>

      {/* 依存関係の詳細 */}
      <div className="card">
        <h3 className="text-xl font-semibold text-gray-900 mb-4">
          Dependencies Status
        </h3>

        <div className="space-y-3">
          {healthStatus.dependencies.map((dep, index) => {
            const depStatusColor = {
              ok: 'bg-green-500',
              degraded: 'bg-yellow-500',
              down: 'bg-red-500',
            }[dep.status];

            return (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center space-x-3">
                  <span
                    className={`w-3 h-3 rounded-full ${depStatusColor}`}
                  ></span>
                  <span className="font-medium">{dep.name}</span>
                  <span className="text-sm text-gray-600 capitalize">
                    ({dep.status})
                  </span>
                </div>

                <div className="text-sm text-gray-600">
                  {'latency' in dep && dep.latency && (
                    <span>{dep.latency}ms</span>
                  )}
                  {'error' in dep && dep.error && (
                    <span className="text-red-600">{dep.error}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* API エンドポイント情報 */}
      <div className="card mt-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-4">
          API Endpoints
        </h3>

        <div className="space-y-2 text-sm">
          <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
            <span className="font-mono">/api/healthz</span>
            <span className="text-gray-600">Liveness check (JSON)</span>
          </div>
          <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
            <span className="font-mono">/api/readyz</span>
            <span className="text-gray-600">Readiness check (JSON)</span>
          </div>
          <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
            <span className="font-mono">/api/diag</span>
            <span className="text-gray-600">Diagnostics (認証必須)</span>
          </div>
        </div>
      </div>

      {/* ナビゲーション */}
      <div className="mt-8 flex justify-between items-center">
        <Link href="/" className="btn btn-secondary">
          トップページに戻る
        </Link>

        <div className="space-x-4">
          <Link href="/api/healthz" className="btn btn-primary" target="_blank">
            JSON形式で確認
          </Link>
          <RefreshButton />
        </div>
      </div>
    </div>
  );
}
