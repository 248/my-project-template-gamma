import { describe, it, expect, vi } from 'vitest';
import { LoggerFactory } from '../logger/logger-factory';
import { DevLogger } from '../logger/dev-logger';
import { WorkersLogger } from '../logger/workers-logger';

// console.log/error をモック
const mockConsoleLog = vi.fn();
const mockConsoleError = vi.fn();

vi.stubGlobal('console', {
  log: mockConsoleLog,
  error: mockConsoleError,
});

describe('LoggerFactory', () => {
  it('should create DevLogger in Node.js environment', () => {
    const logger = LoggerFactory.create({
      level: 'info',
      service: 'test-service',
      env: 'test',
      version: '1.0.0',
      pretty: true,
    });

    expect(logger).toBeInstanceOf(DevLogger);
  });

  it('should create default logger with environment variables', () => {
    const env = {
      LOG_LEVEL: 'debug',
      SERVICE_NAME: 'test-service',
      NODE_ENV: 'development',
      APP_VERSION: '1.0.0',
    };

    const logger = LoggerFactory.createDefault(env);
    expect(logger).toBeDefined();
  });
});

describe('WorkersLogger', () => {
  it('should log info messages as JSON', () => {
    mockConsoleLog.mockClear();
    mockConsoleError.mockClear();

    const logger = new WorkersLogger({
      level: 'info',
      service: 'test-service',
      env: 'production',
      version: '1.0.0',
    });

    logger.info('test message');

    expect(mockConsoleLog).toHaveBeenCalledTimes(1);
    const loggedData = JSON.parse(mockConsoleLog.mock.calls[0][0]);

    expect(loggedData.level).toBe('info');
    expect(loggedData.msg).toBe('test message');
    expect(loggedData.service).toBe('test-service');
    expect(loggedData.env).toBe('production');
    expect(loggedData.version).toBe('1.0.0');
    expect(loggedData.timestamp).toBeDefined();
  });

  it('should log error messages to console.error', () => {
    mockConsoleLog.mockClear();
    mockConsoleError.mockClear();

    const logger = new WorkersLogger({
      level: 'info',
      service: 'test-service',
      env: 'production',
      version: '1.0.0',
    });

    logger.error('error message');

    expect(mockConsoleError).toHaveBeenCalledTimes(1);
    const loggedData = JSON.parse(mockConsoleError.mock.calls[0][0]);

    expect(loggedData.level).toBe('error');
    expect(loggedData.msg).toBe('error message');
  });

  it('should redact sensitive data', () => {
    mockConsoleLog.mockClear();
    mockConsoleError.mockClear();

    const logger = new WorkersLogger({
      level: 'info',
      service: 'test-service',
      env: 'production',
      version: '1.0.0',
      redactPaths: ['password', 'token'],
    });

    logger.info(
      {
        password: 'secret123',
        token: 'bearer-token',
        publicData: 'visible',
      },
      'test with sensitive data'
    );

    expect(mockConsoleLog).toHaveBeenCalledTimes(1);
    const loggedData = JSON.parse(mockConsoleLog.mock.calls[0][0]);

    expect(loggedData.password).toBe('[REDACTED]');
    expect(loggedData.token).toBe('[REDACTED]');
    expect(loggedData.publicData).toBe('visible');
  });

  it('should handle Error objects', () => {
    mockConsoleLog.mockClear();
    mockConsoleError.mockClear();

    const logger = new WorkersLogger({
      level: 'info',
      service: 'test-service',
      env: 'production',
      version: '1.0.0',
    });

    const error = new Error('Test error');
    logger.error({ err: error }, 'error occurred');

    expect(mockConsoleError).toHaveBeenCalledTimes(1);
    const loggedData = JSON.parse(mockConsoleError.mock.calls[0][0]);

    expect(loggedData.err.name).toBe('Error');
    expect(loggedData.err.message).toBe('Test error');
    expect(loggedData.err.stack).toBeDefined();
  });

  it('should create child logger with bindings', () => {
    mockConsoleLog.mockClear();
    mockConsoleError.mockClear();

    const logger = new WorkersLogger({
      level: 'info',
      service: 'test-service',
      env: 'production',
      version: '1.0.0',
    });

    const childLogger = logger.child({
      requestId: 'req-123',
      userId: 'user-456',
    });
    childLogger.info('child log message');

    expect(mockConsoleLog).toHaveBeenCalledTimes(1);
    const loggedData = JSON.parse(mockConsoleLog.mock.calls[0][0]);

    expect(loggedData.requestId).toBe('req-123');
    expect(loggedData.userId).toBe('user-456');
    expect(loggedData.msg).toBe('child log message');
  });
});
