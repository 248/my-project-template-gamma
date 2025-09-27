import { describe, it, expect } from 'vitest';
import {
  aggregateHealthStatus,
  createLivenessResult,
  createReadinessResult,
  createDiagnosticsResult,
  validateHealthCheck,
  determineStatusFromLatency,
  type HealthCheck,
} from '../health';

describe('health', () => {
  describe('aggregateHealthStatus', () => {
    it('空の配列の場合はokを返す', () => {
      expect(aggregateHealthStatus([])).toBe('ok');
    });

    it('すべてのチェックがokの場合はokを返す', () => {
      const checks: HealthCheck[] = [
        { name: 'db', status: 'ok' },
        { name: 'storage', status: 'ok' },
      ];
      expect(aggregateHealthStatus(checks)).toBe('ok');
    });

    it('一つでもdownがある場合はdownを返す', () => {
      const checks: HealthCheck[] = [
        { name: 'db', status: 'ok' },
        { name: 'storage', status: 'down' },
      ];
      expect(aggregateHealthStatus(checks)).toBe('down');
    });

    it('downはないがdegradedがある場合はdegradedを返す', () => {
      const checks: HealthCheck[] = [
        { name: 'db', status: 'ok' },
        { name: 'storage', status: 'degraded' },
      ];
      expect(aggregateHealthStatus(checks)).toBe('degraded');
    });
  });

  describe('createLivenessResult', () => {
    it('正しいLivenessResultを生成する', () => {
      const result = createLivenessResult();

      expect(result.status).toBe('ok');
      expect(result.timestamp).toMatch(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/
      );
    });
  });

  describe('createReadinessResult', () => {
    it('正しいReadinessResultを生成する', () => {
      const dependencies: HealthCheck[] = [
        { name: 'db', status: 'ok', latency: 50 },
        { name: 'storage', status: 'ok', latency: 100 },
      ];

      const metadata = {
        version: '1.0.0',
        commit: 'abc123',
        buildTime: '2024-01-01T00:00:00Z',
      };

      const result = createReadinessResult(dependencies, metadata);

      expect(result.status).toBe('ok');
      expect(result.dependencies).toEqual(dependencies);
      expect(result.version).toBe('1.0.0');
      expect(result.commit).toBe('abc123');
      expect(result.buildTime).toBe('2024-01-01T00:00:00Z');
      expect(result.timestamp).toMatch(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/
      );
    });
  });

  describe('createDiagnosticsResult', () => {
    it('正しいDiagnosticsResultを生成する', () => {
      const dependencies: HealthCheck[] = [{ name: 'db', status: 'ok' }];

      const metadata = {
        version: '1.0.0',
        commit: 'abc123',
        buildTime: '2024-01-01T00:00:00Z',
      };

      const diagnostics = {
        uptime: 3600,
        memory: {
          used: 100,
          total: 1000,
        },
        environment: 'production',
      };

      const result = createDiagnosticsResult(
        dependencies,
        metadata,
        diagnostics
      );

      expect(result.status).toBe('ok');
      expect(result.dependencies).toEqual(dependencies);
      expect(result.version).toBe('1.0.0');
      expect(result.details).toEqual(diagnostics);
    });
  });

  describe('validateHealthCheck', () => {
    it('有効なヘルスチェックの場合はtrueを返す', () => {
      const check: HealthCheck = {
        name: 'db',
        status: 'ok',
        latency: 100,
      };

      expect(validateHealthCheck(check)).toBe(true);
    });

    it('nameが空の場合はfalseを返す', () => {
      const check: HealthCheck = {
        name: '',
        status: 'ok',
      };

      expect(validateHealthCheck(check)).toBe(false);
    });

    it('statusが無効な場合はfalseを返す', () => {
      const check = {
        name: 'db',
        status: 'invalid',
      } as HealthCheck;

      expect(validateHealthCheck(check)).toBe(false);
    });

    it('latencyが負の値の場合はfalseを返す', () => {
      const check: HealthCheck = {
        name: 'db',
        status: 'ok',
        latency: -1,
      };

      expect(validateHealthCheck(check)).toBe(false);
    });
  });

  describe('determineStatusFromLatency', () => {
    it('低いレイテンシーの場合はokを返す', () => {
      expect(determineStatusFromLatency(100)).toBe('ok');
    });

    it('中程度のレイテンシーの場合はdegradedを返す', () => {
      expect(determineStatusFromLatency(1500)).toBe('degraded');
    });

    it('高いレイテンシーの場合はdownを返す', () => {
      expect(determineStatusFromLatency(6000)).toBe('down');
    });

    it('カスタムしきい値を使用できる', () => {
      const thresholds = { degraded: 200, down: 500 };

      expect(determineStatusFromLatency(100, thresholds)).toBe('ok');
      expect(determineStatusFromLatency(300, thresholds)).toBe('degraded');
      expect(determineStatusFromLatency(600, thresholds)).toBe('down');
    });
  });
});
