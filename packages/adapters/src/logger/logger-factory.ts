/**
 * Logger Factory - 環境に応じて適切なLoggerを生成
 */

import { DevLogger } from './dev-logger';
import { WorkersLogger } from './workers-logger';
import type { Logger, LoggerConfig } from './types';

export class LoggerFactory {
  /**
   * 環境に応じてLoggerを作成する
   * @param config Logger設定
   * @param env Cloudflare Workers環境変数（Workers環境の場合）
   * @returns Logger インスタンス
   */
  static create(config: LoggerConfig): Logger {
    // Workers環境の判定
    if (typeof globalThis !== 'undefined' && 'caches' in globalThis) {
      return new WorkersLogger(config);
    }

    // Node.js環境（開発環境）
    return new DevLogger(config);
  }

  /**
   * デフォルト設定でLoggerを作成する
   */
  static createDefault(env?: Record<string, unknown>): Logger {
    const config: LoggerConfig = {
      level: (env?.LOG_LEVEL ||
        process.env.LOG_LEVEL ||
        'info') as LoggerConfig['level'],
      service:
        (env?.SERVICE_NAME as string) ||
        process.env.SERVICE_NAME ||
        'template-gamma',
      env: (env?.NODE_ENV as string) || process.env.NODE_ENV || 'development',
      version:
        (env?.APP_VERSION as string) || process.env.APP_VERSION || '0.1.0',
      pretty:
        ((env?.NODE_ENV as string) || process.env.NODE_ENV) === 'development',
    };

    return LoggerFactory.create(config);
  }
}
