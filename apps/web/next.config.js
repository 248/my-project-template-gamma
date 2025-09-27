/** @type {import('next').NextConfig} */
const nextConfig = {
  // 開発時はstandaloneを無効化（Windows環境でのシンボリックリンク問題回避）
  output: process.env.NODE_ENV === 'production' ? 'standalone' : undefined,

  // 実験的機能の設定
  experimental: {
    // React 19対応
    reactCompiler: false,
  },

  // TypeScript設定
  typescript: {
    // 型チェックはCI/CDで実行
    ignoreBuildErrors: false,
  },

  // ESLint設定
  eslint: {
    // Lintエラーでビルドを停止
    ignoreDuringBuilds: false,
  },

  // 環境変数設定
  env: {
    APP_VERSION: process.env.APP_VERSION || '1.0.0',
    GIT_COMMIT: process.env.GIT_COMMIT || 'dev',
    BUILD_TIME: process.env.BUILD_TIME || new Date().toISOString(),
  },
};

module.exports = nextConfig;
