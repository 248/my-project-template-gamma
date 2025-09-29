/**
 * ヘルスチェックサービス
 * 要件 1.1-1.4, 12.1-12.4: ヘルスチェック機能
 */

import {
  HealthCheck,
  LivenessResult,
  ReadinessResult,
  DiagnosticsResult,
  createLivenessResult,
  createReadinessResult,
  createDiagnosticsResult,
  determineStatusFromLatency,
} from '@template-gamma/core/health';
import {
  SupabaseAdapter,
  StorageAdapter,
  Logger,
} from '@template-gamma/adapters';
import { BffError, ERROR_CODES } from '../error-handler';

/**
 * システムメタデータ
 */
export interface SystemMetadata {
  version: string;
  commit: string;
  buildTime: string;
}

/**
 * ヘルスチェックサービスインターフェース
 */
export interface HealthService {
  checkLiveness(): Promise<LivenessResult>;
  checkReadiness(): Promise<ReadinessResult>;
  checkDiagnostics(): Promise<DiagnosticsResult>;
}

/**
 * ヘルスチェックサービス実装
 */
export class HealthServiceImpl implements HealthService {
  constructor(
    private supabaseAdapter: SupabaseAdapter,
    private storageAdapter: StorageAdapter,
    private logger: Logger,
    private metadata: SystemMetadata
  ) {}

  /**
   * Liveness チェック（軽量チェック）
   * 要件 12.1: 依存に触れない軽量チェック
   */
  async checkLiveness(): Promise<LivenessResult> {
    this.logger.info('Performing liveness check');
    return createLivenessResult();
  }

  /**
   * Readiness チェック（依存関係チェック）
   * 要件 12.2: Supabase/Storage への到達確認
   */
  async checkReadiness(): Promise<ReadinessResult> {
    this.logger.info('Performing readiness check');

    const checks: HealthCheck[] = [];

    try {
      // Supabase接続チェック
      const supabaseCheck = await this.checkSupabase();
      checks.push(supabaseCheck);

      // Storage接続チェック
      const storageCheck = await this.checkStorage();
      checks.push(storageCheck);

      const result = createReadinessResult(checks, this.metadata);

      this.logger.info(
        { status: result.status, dependencies: result.dependencies },
        'Readiness check completed'
      );

      return result;
    } catch (error) {
      this.logger.error({ err: error }, 'Readiness check failed');
      throw new BffError(
        ERROR_CODES.HEALTH_CHECK_FAILED,
        'Readiness check failed'
      );
    }
  }

  /**
   * Diagnostics チェック（詳細診断）
   * 要件 12.3: 遅延・キュー滞留・容量など詳細情報
   */
  async checkDiagnostics(): Promise<DiagnosticsResult> {
    this.logger.info('Performing diagnostics check');

    const checks: HealthCheck[] = [];

    try {
      // 基本的な依存関係チェック
      const supabaseCheck = await this.checkSupabase();
      checks.push(supabaseCheck);

      const storageCheck = await this.checkStorage();
      checks.push(storageCheck);

      // 診断情報の収集
      const diagnostics = await this.collectDiagnostics();

      const result = createDiagnosticsResult(
        checks,
        this.metadata,
        diagnostics
      );

      this.logger.info(
        {
          status: result.status,
          dependencies: result.dependencies,
          diagnostics: result.details,
        },
        'Diagnostics check completed'
      );

      return result;
    } catch (error) {
      this.logger.error({ err: error }, 'Diagnostics check failed');
      throw new BffError(
        ERROR_CODES.HEALTH_CHECK_FAILED,
        'Diagnostics check failed'
      );
    }
  }

  /**
   * Supabase接続チェック
   */
  private async checkSupabase(): Promise<HealthCheck> {
    const startTime = Date.now();

    try {
      const isHealthy = await this.supabaseAdapter.ping();
      const latency = Date.now() - startTime;

      if (!isHealthy) {
        return {
          name: 'supabase',
          status: 'down',
          latency,
          error: 'Supabase ping failed',
        };
      }

      const status = determineStatusFromLatency(latency, {
        degraded: 500, // 500ms
        down: 2000, // 2秒
      });

      return {
        name: 'supabase',
        status,
        latency,
      };
    } catch (error) {
      const latency = Date.now() - startTime;
      this.logger.warn({ err: error, latency }, 'Supabase health check failed');

      return {
        name: 'supabase',
        status: 'down',
        latency,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Storage接続チェック
   */
  private async checkStorage(): Promise<HealthCheck> {
    const startTime = Date.now();

    try {
      const isHealthy = await this.storageAdapter.ping();
      const latency = Date.now() - startTime;

      if (!isHealthy) {
        return {
          name: 'storage',
          status: 'down',
          latency,
          error: 'Storage ping failed',
        };
      }

      const status = determineStatusFromLatency(latency, {
        degraded: 1000, // 1秒
        down: 3000, // 3秒
      });

      return {
        name: 'storage',
        status,
        latency,
      };
    } catch (error) {
      const latency = Date.now() - startTime;
      this.logger.warn({ err: error, latency }, 'Storage health check failed');

      return {
        name: 'storage',
        status: 'down',
        latency,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * 診断情報の収集
   */
  private async collectDiagnostics(): Promise<{
    uptime: number;
    memory?: {
      used: number;
      total: number;
    };
    environment: string;
  }> {
    // プロセス開始時刻からのアップタイム（秒）
    const uptime = process.uptime();

    // メモリ使用量（Node.js環境でのみ利用可能）
    let memory: { used: number; total: number } | undefined;
    try {
      if (typeof process !== 'undefined' && process.memoryUsage) {
        const memUsage = process.memoryUsage();
        memory = {
          used: memUsage.heapUsed,
          total: memUsage.heapTotal,
        };
      }
    } catch {
      // Workers環境などでprocess.memoryUsageが利用できない場合は無視
      this.logger.debug('Memory usage information not available');
    }

    // 環境情報
    const environment = process.env.NODE_ENV || 'unknown';

    return {
      uptime,
      memory,
      environment,
    };
  }
}

/**
 * ヘルスチェックサービスファクトリー
 */
export class HealthServiceFactory {
  static create(
    supabaseAdapter: SupabaseAdapter,
    storageAdapter: StorageAdapter,
    logger: Logger,
    metadata?: Partial<SystemMetadata>
  ): HealthService {
    const systemMetadata: SystemMetadata = {
      version: metadata?.version || process.env.APP_VERSION || '0.0.0',
      commit: metadata?.commit || process.env.GIT_COMMIT || 'unknown',
      buildTime:
        metadata?.buildTime ||
        process.env.BUILD_TIME ||
        new Date().toISOString(),
    };

    return new HealthServiceImpl(
      supabaseAdapter,
      storageAdapter,
      logger,
      systemMetadata
    );
  }
}
