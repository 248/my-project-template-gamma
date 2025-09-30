import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@template-gamma/core': path.resolve(__dirname, '../core'),
      '@template-gamma/adapters': path.resolve(__dirname, '../adapters/src'),
      '@template-gamma/contracts': path.resolve(__dirname, '../contracts'),
    },
  },
  test: {
    environment: 'node',
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/coverage/**',
      ],
    },
  },
});
