import type { OpenNextConfig } from '@opennextjs/cloudflare';

const config: OpenNextConfig = {
  // Cloudflare Workers 用の設定
  cloudflare: {
    // R2 を使用したキャッシュ設定（推奨）
    cache: {
      type: 'r2',
      bucketName: 'template-gamma-cache',
    },

    // 環境変数の設定
    env: {
      // 本番環境で必要な環境変数
      NODE_ENV: 'production',
      BACKEND_MODE: 'monolith',
    },

    // Workers の互換性設定
    compatibility: {
      date: '2025-09-23',
      flags: ['nodejs_compat'],
    },
  },

  // ビルド設定
  build: {
    // 静的アセットの最適化
    minify: true,

    // バンドルサイズの最適化
    splitting: true,
  },

  // 実行時設定
  runtime: {
    // Node.js ランタイムを使用（Edge ランタイムは非対応）
    type: 'nodejs',
  },
};

export default config;
