import { describe, it, expect, vi, beforeEach } from 'vitest';

// Next.js依存関係をモック
vi.mock('next/server', () => ({}));

import { HealthServiceImpl } from '@template-gamma/bff/health/health-service';
import type { SupabaseAdapter } from '@template-gamma/adapters';
import type { StorageAdapter } from '@template-gamma/adapters';
import type { Logger } from '@template-gamma/adapters';

// モックの作成
const mockSupabaseAdapter = {
  ping: vi.fn(),
} as unknown as SupabaseAdapter;

const mockStorageAdapter = {
  ping: vi.fn(),
} as unknown as StorageAdapter;

const mockLogger = {
  info: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  debug: vi.fn(),
} as unknown as Logger;

const mockMetadata = {
  version: '1.0.0',
  commit: 'abc123',
  buildTime: '2024-01-01T00:00:00Z',
};

describe('HealthServiceImpl', () => {
  let healthService: HealthServiceImpl;

  beforeEach(() => {
    vi.clearAllMocks();
    healthService = new HealthServiceImpl(
      mockSupabaseAdapter,
      mockStorageAdapter,
      mockLogger,
      mockMetadata
    );
  });

  describe('checkLiveness', () => {
    it('should return ok status without checking dependencies', async () => {
      const result = await healthService.checkLiveness();

      expect(result.status).toBe('ok');
      expect(result.timestamp).toBeDefined();
      expect(mockSupabaseAdapter.ping).not.toHaveBeenCalled();
      expect(mockStorageAdapter.ping).not.toHaveBeenCalled();
    });
  });

  describe('checkReadiness', () => {
    it('should return ok when all dependencies are healthy', async () => {
      vi.mocked(mockSupabaseAdapter.ping).mockResolvedValue(true);
      vi.mocked(mockStorageAdapter.ping).mockResolvedValue(true);

      const result = await healthService.checkReadiness();

      expect(result.status).toBe('ok');
      expect(result.dependencies).toHaveLength(2);
      expect(result.dependencies[0]).toMatchObject({
        name: 'supabase',
        status: 'ok',
      });
      expect(result.dependencies[1]).toMatchObject({
        name: 'storage',
        status: 'ok',
      });
      expect(result.version).toBe('1.0.0');
      expect(result.commit).toBe('abc123');
      expect(result.buildTime).toBe('2024-01-01T00:00:00Z');
    });

    it('should return down when some dependencies fail', async () => {
      vi.mocked(mockSupabaseAdapter.ping).mockResolvedValue(true);
      vi.mocked(mockStorageAdapter.ping).mockResolvedValue(false);

      const result = await healthService.checkReadiness();

      expect(result.status).toBe('down'); // Core層のロジックでは、1つでもdownがあればdown
      expect(result.dependencies).toHaveLength(2);
      expect(result.dependencies[0].status).toBe('ok');
      expect(result.dependencies[1].status).toBe('down');
    });

    it('should handle dependency ping errors gracefully', async () => {
      vi.mocked(mockSupabaseAdapter.ping).mockRejectedValue(
        new Error('Connection failed')
      );
      vi.mocked(mockStorageAdapter.ping).mockResolvedValue(true);

      const result = await healthService.checkReadiness();

      expect(result.status).toBe('down'); // エラーがあればdown
      expect(result.dependencies[0]).toMatchObject({
        name: 'supabase',
        status: 'down',
        error: 'Connection failed',
      });
    });

    it('should measure latency for dependency checks', async () => {
      vi.mocked(mockSupabaseAdapter.ping).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve(true), 100))
      );
      vi.mocked(mockStorageAdapter.ping).mockResolvedValue(true);

      const result = await healthService.checkReadiness();

      expect(result.dependencies[0].latency).toBeGreaterThan(90);
      expect(result.dependencies[0].latency).toBeLessThan(200);
    });
  });

  describe('checkDiagnostics', () => {
    it('should return detailed diagnostic information', async () => {
      vi.mocked(mockSupabaseAdapter.ping).mockResolvedValue(true);
      vi.mocked(mockStorageAdapter.ping).mockResolvedValue(true);

      const result = await healthService.checkDiagnostics();

      expect(result.status).toBe('ok');
      expect(result.dependencies).toHaveLength(2);
      expect(result.details).toBeDefined();
      expect(result.details.uptime).toBeGreaterThan(0);
      expect(result.details.environment).toBeDefined();
    });
  });
});
