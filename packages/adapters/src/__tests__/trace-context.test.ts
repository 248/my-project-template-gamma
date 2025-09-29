import { describe, it, expect } from 'vitest';
import { TraceContext } from '../trace-context/trace-context';

describe('TraceContext', () => {
  describe('parseTraceparent', () => {
    it('should parse valid traceparent header', () => {
      const traceparent =
        '00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01';
      const result = TraceContext.parseTraceparent(traceparent);

      expect(result.traceId).toBe('4bf92f3577b34da6a3ce929d0e0e4736');
      expect(result.parentId).toBe('00f067aa0ba902b7');
      expect(result.flags).toBe('01');
      expect(result.spanId).toHaveLength(16);
    });

    it('should generate new trace for invalid traceparent', () => {
      const result = TraceContext.parseTraceparent('invalid-header');

      expect(result.traceId).toHaveLength(32);
      expect(result.spanId).toHaveLength(16);
      expect(result.flags).toBe('01');
      expect(result.parentId).toBeUndefined();
    });

    it('should generate new trace when no traceparent provided', () => {
      const result = TraceContext.parseTraceparent();

      expect(result.traceId).toHaveLength(32);
      expect(result.spanId).toHaveLength(16);
      expect(result.flags).toBe('01');
      expect(result.parentId).toBeUndefined();
    });
  });

  describe('generateTraceparent', () => {
    it('should generate valid traceparent header', () => {
      const traceInfo = {
        traceId: '4bf92f3577b34da6a3ce929d0e0e4736',
        spanId: '00f067aa0ba902b7',
        flags: '01',
      };

      const result = TraceContext.generateTraceparent(traceInfo);
      expect(result).toBe(
        '00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01'
      );
    });
  });

  describe('generateChildSpan', () => {
    it('should generate child span with same trace ID', () => {
      const parentTrace = {
        traceId: '4bf92f3577b34da6a3ce929d0e0e4736',
        spanId: '00f067aa0ba902b7',
        flags: '01',
      };

      const childSpan = TraceContext.generateChildSpan(parentTrace);

      expect(childSpan.traceId).toBe(parentTrace.traceId);
      expect(childSpan.parentId).toBe(parentTrace.spanId);
      expect(childSpan.spanId).not.toBe(parentTrace.spanId);
      expect(childSpan.spanId).toHaveLength(16);
      expect(childSpan.flags).toBe(parentTrace.flags);
    });
  });

  describe('generateRequestId', () => {
    it('should generate valid UUID', () => {
      const requestId = TraceContext.generateRequestId();

      // UUID v4 format check
      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      expect(requestId).toMatch(uuidRegex);
    });
  });
});
