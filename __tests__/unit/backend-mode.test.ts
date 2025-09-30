/**
 * バックエンドモード切替のテスト
 * 要件17.1: BACKEND_MODE=monolith|service を CI マトリクスで両方検証する
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  getBackendMode,
  isMonolithMode,
  isServiceMode,
  validateBackendMode,
  BACKEND_MODES,
} from '@template-gamma/contracts/backend-mode';

describe('Backend Mode Configuration', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // 環境変数をリセット
    process.env = { ...originalEnv };
    delete process.env.BACKEND_MODE;
    delete process.env.NEXT_PUBLIC_BACKEND_MODE;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('getBackendMode', () => {
    it('should return monolith as default when no env var is set', () => {
      expect(getBackendMode()).toBe(BACKEND_MODES.MONOLITH);
    });

    it('should return monolith when BACKEND_MODE is set to monolith', () => {
      process.env.BACKEND_MODE = 'monolith';
      expect(getBackendMode()).toBe(BACKEND_MODES.MONOLITH);
    });

    it('should return service when BACKEND_MODE is set to service', () => {
      process.env.BACKEND_MODE = 'service';
      expect(getBackendMode()).toBe(BACKEND_MODES.SERVICE);
    });

    it('should return monolith when BACKEND_MODE is invalid', () => {
      process.env.BACKEND_MODE = 'invalid';
      expect(getBackendMode()).toBe(BACKEND_MODES.MONOLITH);
    });

    it('should use NEXT_PUBLIC_BACKEND_MODE as fallback', () => {
      process.env.NEXT_PUBLIC_BACKEND_MODE = 'service';
      expect(getBackendMode()).toBe(BACKEND_MODES.SERVICE);
    });

    it('should prioritize BACKEND_MODE over NEXT_PUBLIC_BACKEND_MODE', () => {
      process.env.BACKEND_MODE = 'monolith';
      process.env.NEXT_PUBLIC_BACKEND_MODE = 'service';
      expect(getBackendMode()).toBe(BACKEND_MODES.MONOLITH);
    });
  });

  describe('isMonolithMode', () => {
    it('should return true when mode is monolith', () => {
      process.env.BACKEND_MODE = 'monolith';
      expect(isMonolithMode()).toBe(true);
    });

    it('should return false when mode is service', () => {
      process.env.BACKEND_MODE = 'service';
      expect(isMonolithMode()).toBe(false);
    });

    it('should return true by default', () => {
      expect(isMonolithMode()).toBe(true);
    });
  });

  describe('isServiceMode', () => {
    it('should return false when mode is monolith', () => {
      process.env.BACKEND_MODE = 'monolith';
      expect(isServiceMode()).toBe(false);
    });

    it('should return true when mode is service', () => {
      process.env.BACKEND_MODE = 'service';
      expect(isServiceMode()).toBe(true);
    });

    it('should return false by default', () => {
      expect(isServiceMode()).toBe(false);
    });
  });

  describe('validateBackendMode', () => {
    it('should return true for valid modes', () => {
      expect(validateBackendMode('monolith')).toBe(true);
      expect(validateBackendMode('service')).toBe(true);
    });

    it('should return false for invalid modes', () => {
      expect(validateBackendMode('invalid')).toBe(false);
      expect(validateBackendMode('')).toBe(false);
      expect(validateBackendMode('MONOLITH')).toBe(false);
    });
  });
});
