import { describe, it, expect } from 'vitest';
import { aggregateHealthStatus } from '@template-gamma/core/health';
import type { HealthCheck } from '@template-gamma/core/health';

describe('aggregateHealthStatus', () => {
  it('should return ok when all checks are ok', () => {
    const checks: HealthCheck[] = [
      { name: 'supabase', status: 'ok' },
      { name: 'storage', status: 'ok' },
    ];

    expect(aggregateHealthStatus(checks)).toBe('ok');
  });

  it('should return degraded when some checks are degraded', () => {
    const checks: HealthCheck[] = [
      { name: 'supabase', status: 'ok' },
      { name: 'storage', status: 'degraded' },
    ];

    expect(aggregateHealthStatus(checks)).toBe('degraded');
  });

  it('should return down when any check is down', () => {
    const checks: HealthCheck[] = [
      { name: 'supabase', status: 'ok' },
      { name: 'storage', status: 'down' },
    ];

    expect(aggregateHealthStatus(checks)).toBe('down');
  });

  it('should return ok for empty checks array', () => {
    const checks: HealthCheck[] = [];
    expect(aggregateHealthStatus(checks)).toBe('ok');
  });

  it('should prioritize down over degraded', () => {
    const checks: HealthCheck[] = [
      { name: 'supabase', status: 'degraded' },
      { name: 'storage', status: 'down' },
      { name: 'cache', status: 'ok' },
    ];

    expect(aggregateHealthStatus(checks)).toBe('down');
  });
});
