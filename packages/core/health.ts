/**
 * ヘルスチェック関連の純粋関数とビジネスロジック
 * 要件 1.1: ヘルスチェック機能
 */

export interface HealthCheck {
  name: string;
  status: 'ok' | 'degraded' | 'down';
  latency?: number;
  error?: string;
}

export interface HealthResult {
  status: 'ok' | 'degraded' | 'down';
  dependencies: HealthCheck[];
  version: string;
  commit: string;
  buildTime: string;
  timestamp: string;
}

export interface LivenessResult {
  status: 'ok';
  timestamp: string;
}

export interface ReadinessResult extends HealthResult {}

export interface DiagnosticsResult extends HealthResult {
  details: {
    uptime: number;
    memory?: {
      used: number;
      total: number;
    };
    environment: string;
  };
}

/**
 * 複数のヘルスチェック結果から全体のステータスを決定する純粋関数
 * @param checks ヘルスチェック結果の配列
 * @returns 集約されたステータス
 */
export function aggregateHealthStatus(
  checks: HealthCheck[]
): 'ok' | 'degraded' | 'down' {
  if (checks.length === 0) {
    return 'ok';
  }

  const hasDown = checks.some((check) => check.status === 'down');
  if (hasDown) {
    return 'down';
  }

  const hasDegraded = checks.some((check) => check.status === 'degraded');
  if (hasDegraded) {
    return 'degraded';
  }

  return 'ok';
}

/**
 * Liveness チェック結果を生成する純粋関数
 * @returns Liveness チェック結果
 */
export function createLivenessResult(): LivenessResult {
  return {
    status: 'ok',
    timestamp: new Date().toISOString(),
  };
}

/**
 * Readiness チェック結果を生成する純粋関数
 * @param dependencies 依存関係のヘルスチェック結果
 * @param metadata システムメタデータ
 * @returns Readiness チェック結果
 */
export function createReadinessResult(
  dependencies: HealthCheck[],
  metadata: {
    version: string;
    commit: string;
    buildTime: string;
  }
): ReadinessResult {
  const status = aggregateHealthStatus(dependencies);

  return {
    status,
    dependencies,
    version: metadata.version,
    commit: metadata.commit,
    buildTime: metadata.buildTime,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Diagnostics チェック結果を生成する純粋関数
 * @param dependencies 依存関係のヘルスチェック結果
 * @param metadata システムメタデータ
 * @param diagnostics 診断情報
 * @returns Diagnostics チェック結果
 */
export function createDiagnosticsResult(
  dependencies: HealthCheck[],
  metadata: {
    version: string;
    commit: string;
    buildTime: string;
  },
  diagnostics: {
    uptime: number;
    memory?: {
      used: number;
      total: number;
    };
    environment: string;
  }
): DiagnosticsResult {
  const status = aggregateHealthStatus(dependencies);

  return {
    status,
    dependencies,
    version: metadata.version,
    commit: metadata.commit,
    buildTime: metadata.buildTime,
    timestamp: new Date().toISOString(),
    details: diagnostics,
  };
}

/**
 * ヘルスチェック結果を検証する純粋関数
 * @param check ヘルスチェック結果
 * @returns 検証結果
 */
export function validateHealthCheck(check: HealthCheck): boolean {
  if (!check.name || typeof check.name !== 'string') {
    return false;
  }

  if (!['ok', 'degraded', 'down'].includes(check.status)) {
    return false;
  }

  if (
    check.latency !== undefined &&
    (typeof check.latency !== 'number' || check.latency < 0)
  ) {
    return false;
  }

  return true;
}

/**
 * レイテンシーに基づいてヘルスチェックステータスを決定する純粋関数
 * @param latency レイテンシー（ミリ秒）
 * @param thresholds しきい値設定
 * @returns ステータス
 */
export function determineStatusFromLatency(
  latency: number,
  thresholds: {
    degraded: number;
    down: number;
  } = {
    degraded: 1000, // 1秒
    down: 5000, // 5秒
  }
): 'ok' | 'degraded' | 'down' {
  if (latency >= thresholds.down) {
    return 'down';
  }
  if (latency >= thresholds.degraded) {
    return 'degraded';
  }
  return 'ok';
}
