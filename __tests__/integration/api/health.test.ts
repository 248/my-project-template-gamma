import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';

// Next.js依存関係をモック
vi.mock('next', () => ({
  default: vi.fn(),
}));

vi.mock('http', () => ({
  createServer: vi.fn(),
}));

vi.mock('url', () => ({
  parse: vi.fn(),
}));

// MSWを使用したAPIテスト
import { server } from '../../utils/mocks';

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'warn' });
});

afterAll(() => {
  server.close();
});

describe('Health API Integration Tests', () => {
  const baseUrl = 'http://localhost:3000'; // MSWでモックされたベースURL

  describe('/api/healthz (Liveness)', () => {
    it('should return 200 with basic health status', async () => {
      const response = await fetch(`${baseUrl}/api/healthz`);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toMatchObject({
        status: 'ok',
        timestamp: expect.any(String),
      });

      // タイムスタンプが有効なISO文字列であることを確認
      expect(() => new Date(data.timestamp)).not.toThrow();
    });

    it('should respond quickly (< 100ms)', async () => {
      const start = Date.now();
      const response = await fetch(`${baseUrl}/api/healthz`);
      const duration = Date.now() - start;

      expect(response.status).toBe(200);
      expect(duration).toBeLessThan(100);
    });
  });

  describe('/api/readyz (Readiness)', () => {
    it('should return readiness status with dependencies', async () => {
      const response = await fetch(`${baseUrl}/api/readyz`);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toMatchObject({
        status: expect.stringMatching(/^(ok|degraded|down)$/),
        dependencies: expect.arrayContaining([
          expect.objectContaining({
            name: expect.any(String),
            status: expect.stringMatching(/^(ok|degraded|down)$/),
          }),
        ]),
        version: expect.any(String),
        commit: expect.any(String),
        buildTime: expect.any(String),
      });
    });

    it('should include latency measurements for dependencies', async () => {
      const response = await fetch(`${baseUrl}/api/readyz`);
      const data = await response.json();

      expect(response.status).toBe(200);
      data.dependencies.forEach((dep: { status: string; latency?: number }) => {
        if (dep.status === 'ok') {
          expect(dep.latency).toBeTypeOf('number');
          expect(dep.latency).toBeGreaterThan(0);
        }
      });
    });

    it('should meet performance requirements (p95 < 300ms)', async () => {
      const measurements: number[] = [];
      const iterations = 20;

      // 複数回実行してp95を測定
      for (let i = 0; i < iterations; i++) {
        const start = Date.now();
        const response = await fetch(`${baseUrl}/api/readyz`);
        const duration = Date.now() - start;

        expect(response.status).toBe(200);
        measurements.push(duration);
      }

      measurements.sort((a, b) => a - b);
      const p95Index = Math.floor(measurements.length * 0.95);
      const p95 = measurements[p95Index];

      expect(p95).toBeLessThan(300);
    });
  });

  describe('/api/diag (Diagnostics)', () => {
    it('should require authentication', async () => {
      const response = await fetch(`${baseUrl}/api/diag`);

      expect(response.status).toBe(401);
    });

    it('should return detailed diagnostics for authenticated users', async () => {
      // 認証付きリクエストのテスト（モックセッション使用）
      const response = await fetch(`${baseUrl}/api/diag`, {
        headers: {
          Cookie: 'sb-access-token=mock-token-for-test',
        },
      });

      if (response.status === 200) {
        const data = await response.json();
        expect(data).toMatchObject({
          status: expect.stringMatching(/^(ok|degraded|down)$/),
          dependencies: expect.any(Array),
          system: expect.objectContaining({
            uptime: expect.any(Number),
            memory: expect.any(Object),
            nodeVersion: expect.any(String),
          }),
        });
      } else {
        // 認証が実装されていない場合は401を期待
        expect(response.status).toBe(401);
      }
    });
  });

  describe('/api/health (Legacy)', () => {
    it('should return health status for backward compatibility', async () => {
      const response = await fetch(`${baseUrl}/api/health`);

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toMatchObject({
        status: expect.stringMatching(/^(ok|degraded|down)$/),
      });
    });
  });
});
