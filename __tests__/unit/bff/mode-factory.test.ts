/**
 * BFF層のモードファクトリーのテスト
 * 要件17.1: BACKEND_MODE=monolith|service を CI マトリクスで両方検証する
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Next.js依存関係をモック
vi.mock('next/server', () => ({}));
import {
  createServiceFactory,
  getModeInfo,
  MonolithServiceFactory,
  ServiceModeFactory,
} from '@template-gamma/bff/mode-factory';

describe('Mode Factory', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.BACKEND_MODE;
    delete process.env.NEXT_PUBLIC_BACKEND_MODE;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('createServiceFactory', () => {
    it('should return MonolithServiceFactory for monolith mode', () => {
      process.env.BACKEND_MODE = 'monolith';
      const mockEnv = {
        USE_MOCK_SUPABASE: 'true',
        USE_MOCK_STORAGE: 'true',
        NODE_ENV: 'test',
      };
      const factory = createServiceFactory(mockEnv);
      expect(factory).toBeInstanceOf(MonolithServiceFactory);
    });

    it('should return ServiceModeFactory for service mode', () => {
      process.env.BACKEND_MODE = 'service';
      const factory = createServiceFactory();
      expect(factory).toBeInstanceOf(ServiceModeFactory);
    });

    it('should return MonolithServiceFactory by default', () => {
      const mockEnv = {
        USE_MOCK_SUPABASE: 'true',
        USE_MOCK_STORAGE: 'true',
        NODE_ENV: 'test',
      };
      const factory = createServiceFactory(mockEnv);
      expect(factory).toBeInstanceOf(MonolithServiceFactory);
    });
  });

  describe('getModeInfo', () => {
    it('should return correct info for monolith mode', () => {
      process.env.BACKEND_MODE = 'monolith';
      const info = getModeInfo();

      expect(info.mode).toBe('monolith');
      expect(info.isMonolith).toBe(true);
      expect(info.description).toContain('Direct BFF layer access');
    });

    it('should return correct info for service mode', () => {
      process.env.BACKEND_MODE = 'service';
      const info = getModeInfo();

      expect(info.mode).toBe('service');
      expect(info.isMonolith).toBe(false);
      expect(info.description).toContain('External service communication');
    });
  });

  describe('MonolithServiceFactory', () => {
    it('should create all services without throwing', () => {
      // モック環境変数を設定
      const mockEnv = {
        USE_MOCK_SUPABASE: 'true',
        USE_MOCK_STORAGE: 'true',
        NODE_ENV: 'test',
      };

      const factory = new MonolithServiceFactory(mockEnv);

      expect(() => factory.createHealthService()).not.toThrow();
      expect(() => factory.createAuthService()).not.toThrow();
      expect(() => factory.createImageService()).not.toThrow();
      expect(() => factory.createUserService()).not.toThrow();
    });
  });

  describe('ServiceModeFactory', () => {
    it('should throw error for all services (not implemented yet)', () => {
      const factory = new ServiceModeFactory();

      expect(() => factory.createHealthService()).toThrow(
        'Service mode not implemented yet'
      );
      expect(() => factory.createAuthService()).toThrow(
        'Service mode not implemented yet'
      );
      expect(() => factory.createImageService()).toThrow(
        'Service mode not implemented yet'
      );
      expect(() => factory.createUserService()).toThrow(
        'Service mode not implemented yet'
      );
    });
  });
});
