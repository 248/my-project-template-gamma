/**
 * クライアントサイド用ロガー
 * 要件 7.1, 7.2: 構造化ログ、TraceContext統合
 */

import { LoggerFactory, type Logger } from '@template-gamma/adapters';

/**
 * クライアントサイド用のロガーを作成する
 */
export function createClientLogger(): Logger {
  return LoggerFactory.create({
    level: (process.env.NEXT_PUBLIC_LOG_LEVEL as any) || 'info',
    service: 'template-gamma-client',
    env: process.env.NODE_ENV || 'development',
    version: process.env.NEXT_PUBLIC_APP_VERSION || '0.1.0',
    pretty: false, // クライアントサイドでは常にfalse
  });
}

// デフォルトのクライアントロガーインスタンス
export const clientLogger = createClientLogger();
