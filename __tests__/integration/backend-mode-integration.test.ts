/**
 * バックエンドモード切替の統合テスト
 * 要件17.1: BACKEND_MODE=monolith|service を CI マトリクスで両方検証する
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  getBackendMode,
  isMonolithMode,
  isServiceMode,
} from '@template-gamma/contracts/backend-mode';

describe('Backend Mode Integration', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.BACKEND_MODE;
    delete process.env.NEXT_PUBLIC_BACKEND_MODE;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('Environment Variable Integration', () => {
    it('should resolve mode from environment variables', () => {
      process.env.BACKEND_MODE = 'monolith';
      const mode = getBackendMode();

      expect(mode).toBe('monolith');
      expect(isMonolithMode()).toBe(true);
      expect(isServiceMode()).toBe(false);
    });

    it('should handle service mode', () => {
      process.env.BACKEND_MODE = 'service';
      const mode = getBackendMode();

      expect(mode).toBe('service');
      expect(isMonolithMode()).toBe(false);
      expect(isServiceMode()).toBe(true);
    });
  });

  describe('Mode switching scenarios', () => {
    it('should switch from monolith to service mode', () => {
      // Start with monolith
      process.env.BACKEND_MODE = 'monolith';
      let mode = getBackendMode();
      expect(mode).toBe('monolith');
      expect(isMonolithMode()).toBe(true);

      // Switch to service
      process.env.BACKEND_MODE = 'service';
      mode = getBackendMode();
      expect(mode).toBe('service');
      expect(isMonolithMode()).toBe(false);
    });

    it('should handle environment variable priority correctly', () => {
      // Set both variables with different values
      process.env.BACKEND_MODE = 'monolith';
      process.env.NEXT_PUBLIC_BACKEND_MODE = 'service';

      const mode = getBackendMode();
      expect(mode).toBe('monolith'); // BACKEND_MODE should take priority
    });
  });
});
