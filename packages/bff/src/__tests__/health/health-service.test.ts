/**
 * ヘルスチェックサービスのテスト
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { HealthServiceImpl } from '../../health/health-service.js';
import {
  createMockSupabaseAdapter,
  createMockStorageAdapter,
  createMockLogger,
  createFailingMockSupabaseAdapter,
  createFailingMockStorageAdapter,
} from '../helpers/mocks.js';

describe('HealthServiceImpl', () => {
  let healthService: HealthServiceImpl;
  let mockSupabaseAdapter: ReturnType<typeof createMockSupabaseAdapter>;
  let mockStorageAdapter: ReturnType<typeof createMockStorageAdapter>;
  let mockLogger: ReturnType<typeof createMockLogger>;

  const mockMetadata = {
    version: '1.0.0',
    commit: 'abc123',
    buildTime: '2024-01-01T00:00:00Z',
  };

  beforeEach(() => {
    mockSupabaseAdapter = createMockSupabaseAdapter();
    mockStorageAdapter = createMockStorageAdapter();
    mockLogger = createMockLogger();

    healthService = new HealthServiceImpl(
      mockSupabaseAdapter,
      mockStorageAdapter,
      mockLogger,
      mockMetadata
    );
  });

  describe('checkLiveness', () => {
    it('should return ok status with timestamp', async () => {
      const result = await healthService.checkLiveness();

      expect(result).toEqual({
        status: 'ok',
        timestamp: expect.any(String),
      });

      expect(mockLogger.info).toHaveBeenCalledWith('Performing liveness check');
    });
  });

  describe('checkReadiness', () => {
    it('should return ok status when all dependencies are healthy', async () => {
      const result = await healthService.checkReadiness();

      expect(result).toEqual({
        status: 'ok',
        dependencies: [
          {
            name: 'supabase',
            status: 'ok',
            latency: expect.any(Number),
          },
          {
            name: 'storage',
            status: 'ok',
            latency: expect.any(Number),
          },
        ],
        version: '1.0.0',
        commit: 'abc123',
        buildTime: '2024-01-01T00:00:00Z',
        timestamp: expect.any(String),
      });

      expect(mockSupabaseAdapter.ping).toHaveBeenCalled();
      expect(mockStorageAdapter.ping).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Performing readiness check'
      );
    });

    it('should return down status when supabase is down', async () => {
      const failingSupabaseAdapter = createFailingMockSupabaseAdapter();

      healthService = new HealthServiceImpl(
        failingSupabaseAdapter,
        mockStorageAdapter,
        mockLogger,
        mockMetadata
      );

      const result = await healthService.checkReadiness();

      expect(result.status).toBe('down');
      expect(result.dependencies).toEqual([
        {
          name: 'supabase',
          status: 'down',
          latency: expect.any(Number),
          error: 'Database connection failed',
        },
        {
          name: 'storage',
          status: 'ok',
          latency: expect.any(Number),
        },
      ]);
    });

    it('should return down status when storage is down', async () => {
      const failingStorageAdapter = createFailingMockStorageAdapter();

      healthService = new HealthServiceImpl(
        mockSupabaseAdapter,
        failingStorageAdapter,
        mockLogger,
        mockMetadata
      );

      const result = await healthService.checkReadiness();

      expect(result.status).toBe('down');
      expect(result.dependencies).toEqual([
        {
          name: 'supabase',
          status: 'ok',
          latency: expect.any(Number),
        },
        {
          name: 'storage',
          status: 'down',
          latency: expect.any(Number),
          error: 'Storage connection failed',
        },
      ]);
    });

    it('should return degraded status when latency is high', async () => {
      // 高レイテンシーをシミュレート
      mockSupabaseAdapter.ping = vi.fn().mockImplementation(async () => {
        await new Promise((resolve) => setTimeout(resolve, 600)); // 600ms
        return true;
      });

      const result = await healthService.checkReadiness();

      expect(result.status).toBe('degraded');
      expect(result.dependencies[0]).toEqual({
        name: 'supabase',
        status: 'degraded',
        latency: expect.any(Number),
      });
    });
  });

  describe('checkDiagnostics', () => {
    it('should return diagnostics with system information', async () => {
      const result = await healthService.checkDiagnostics();

      expect(result).toEqual({
        status: 'ok',
        dependencies: [
          {
            name: 'supabase',
            status: 'ok',
            latency: expect.any(Number),
          },
          {
            name: 'storage',
            status: 'ok',
            latency: expect.any(Number),
          },
        ],
        version: '1.0.0',
        commit: 'abc123',
        buildTime: '2024-01-01T00:00:00Z',
        timestamp: expect.any(String),
        details: {
          uptime: expect.any(Number),
          memory: expect.any(Object),
          environment: expect.any(String),
        },
      });

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'ok',
          dependencies: expect.any(Array),
          diagnostics: expect.any(Object),
        }),
        'Diagnostics check completed'
      );
    });

    it('should handle missing memory information gracefully', async () => {
      // process.memoryUsage を一時的に無効化
      const originalMemoryUsage = process.memoryUsage;
      delete (process as Record<string, unknown>).memoryUsage;

      const result = await healthService.checkDiagnostics();

      expect(result.details.memory).toBeUndefined();
      expect(result.details.uptime).toBeGreaterThanOrEqual(0);
      expect(result.details.environment).toBeDefined();

      // 復元
      process.memoryUsage = originalMemoryUsage;
    });
  });

  describe('error handling', () => {
    it('should throw BffError when readiness check fails unexpectedly', async () => {
      // ping メソッドが例外を投げるように設定
      mockSupabaseAdapter.ping = vi
        .fn()
        .mockRejectedValue(new Error('Unexpected error'));
      mockStorageAdapter.ping = vi
        .fn()
        .mockRejectedValue(new Error('Unexpected error'));

      await expect(healthService.checkReadiness()).rejects.toThrow(
        'Readiness check failed'
      );

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({ err: expect.any(Error) }),
        'Readiness check failed'
      );
    });

    it('should throw BffError when diagnostics check fails unexpectedly', async () => {
      // ping メソッドが例外を投げるように設定
      mockSupabaseAdapter.ping = vi
        .fn()
        .mockRejectedValue(new Error('Unexpected error'));

      await expect(healthService.checkDiagnostics()).rejects.toThrow(
        'Diagnostics check failed'
      );

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({ err: expect.any(Error) }),
        'Diagnostics check failed'
      );
    });
  });
});
