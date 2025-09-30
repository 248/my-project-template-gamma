/**
 * バックエンドモードの定義と切替機能
 * 要件17.1: BACKEND_MODE=monolith|service を CI マトリクスで両方検証する
 */

export const BACKEND_MODES = {
  MONOLITH: 'monolith',
  SERVICE: 'service',
} as const;

export type BackendMode = (typeof BACKEND_MODES)[keyof typeof BACKEND_MODES];

/**
 * 環境変数からバックエンドモードを取得
 */
export function getBackendMode(): BackendMode {
  const mode = process.env.BACKEND_MODE || process.env.NEXT_PUBLIC_BACKEND_MODE;

  if (mode === BACKEND_MODES.SERVICE) {
    return BACKEND_MODES.SERVICE;
  }

  // デフォルトはmonolithモード
  return BACKEND_MODES.MONOLITH;
}

/**
 * 現在のモードがmonolithかどうかを判定
 */
export function isMonolithMode(): boolean {
  return getBackendMode() === BACKEND_MODES.MONOLITH;
}

/**
 * 現在のモードがserviceかどうかを判定
 */
export function isServiceMode(): boolean {
  return getBackendMode() === BACKEND_MODES.SERVICE;
}

/**
 * モード切替のバリデーション
 */
export function validateBackendMode(mode: string): mode is BackendMode {
  return Object.values(BACKEND_MODES).includes(mode as BackendMode);
}
