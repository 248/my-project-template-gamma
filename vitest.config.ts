import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./test/setup.ts'],
    include: ['**/__tests__/**/*.{test,spec}.{js,ts,tsx}'],
    exclude: ['node_modules', '.next', 'dist', 'build'],
  },
  define: {
    'process.env.NODE_ENV': '"test"',
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './apps/web/src'),
      '@/components': path.resolve(__dirname, './apps/web/src/components'),
      '@/lib': path.resolve(__dirname, './apps/web/src/lib'),
      '@/app': path.resolve(__dirname, './apps/web/src/app'),
      '@template-gamma/contracts': path.resolve(
        __dirname,
        './packages/contracts'
      ),
      '@template-gamma/bff': path.resolve(__dirname, './packages/bff/src'),
      '@template-gamma/core': path.resolve(__dirname, './packages/core'),
      '@template-gamma/adapters': path.resolve(
        __dirname,
        './packages/adapters/src'
      ),
    },
  },
});
