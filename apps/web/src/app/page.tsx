import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-8rem)]">
      <div className="max-w-md w-full mx-auto">
        <div className="card text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Welcome to Template Gamma
          </h1>
          <p className="text-gray-600 mb-8">
            Next.js 15.5.2 + React 19.0.0 を使用した
            <br />
            Cloudflare Workers 対応テンプレート
          </p>

          <div className="space-y-4">
            <Link
              href="/auth/login"
              className="btn btn-primary w-full block text-center"
            >
              ログイン
            </Link>

            <div className="text-sm text-gray-500">
              <p>または</p>
            </div>

            <Link
              href="/health"
              className="btn btn-secondary w-full block text-center"
            >
              システム状態を確認
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
