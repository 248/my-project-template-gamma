/** @type {import('next').NextConfig} */
const nextConfig = {
  // OpenNext Cloudflare アダプタ用設定
  output: 'standalone',

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

  // Webpack設定
  webpack: (config, { isServer }) => {
    // Node.js固有のモジュールをサーバーサイドでのみ利用
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        async_hooks: false,
      };
    }
    return config;
  },

  // Cloudflare Workers 互換性設定
  // Edge Runtime は使用しない（OpenNext Cloudflare は Node.js ランタイムのみサポート）
  // runtime: 'nodejs', // デフォルトなので明示的に設定不要
};

module.exports = nextConfig;
