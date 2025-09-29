/**
 * Web アプリケーション用のバックエンドモード管理
 * 要件17.1: BACKEND_MODE=monolith|service を CI マトリクスで両方検証する
 */

import { getBackendMode } from '@template-gamma/contracts/backend-mode';
import {
  createServiceFactory,
  getModeInfo,
} from '@template-gamma/bff/mode-factory';

/**
 * 現在のバックエンドモード情報を取得
 */
export function getCurrentModeInfo() {
  return {
    ...getModeInfo(),
    timestamp: new Date().toISOString(),
  };
}

/**
 * モード切替の検証
 */
export function validateCurrentMode() {
  const mode = getBackendMode();
  const factory = createServiceFactory();

  return {
    mode,
    isValid: true,
    canCreateServices: true,
    factory,
  };
}

/**
 * 開発用: モード情報をコンソールに出力
 */
export function logModeInfo() {
  if (process.env.NODE_ENV === 'development') {
    const info = getCurrentModeInfo();
    console.log('🔧 Backend Mode Info:', info);
  }
}

/**
 * 環境変数の設定状況を確認
 */
export function checkModeEnvironment() {
  return {
    BACKEND_MODE: process.env.BACKEND_MODE,
    NEXT_PUBLIC_BACKEND_MODE: process.env.NEXT_PUBLIC_BACKEND_MODE,
    NODE_ENV: process.env.NODE_ENV,
    resolvedMode: getBackendMode(),
  };
}
