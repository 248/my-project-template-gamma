import Link from 'next/link';

export default function LoginPage() {
  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-8rem)]">
      <div className="max-w-md w-full mx-auto">
        <div className="card">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">ログイン</h1>
            <p className="text-gray-600">Supabase OAuth認証でログインします</p>
          </div>

          {/* OAuth プロバイダー選択（モック） */}
          <div className="space-y-4">
            <button className="btn btn-primary w-full">
              GitHub でログイン（実装予定）
            </button>

            <button className="btn btn-secondary w-full">
              Google でログイン（実装予定）
            </button>
          </div>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500">
              認証機能は後のタスクで実装されます
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
