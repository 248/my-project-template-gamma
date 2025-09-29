/**
 * W3C TraceContext 実装
 * 要件 13.4: W3C TraceContext（traceparent）を受継ぎ/発行し、将来の OTLP Exporter 追加を阻害しない命名を使用する
 * 要件 7.2: requestId、traceId、service、env、version を必須項目として追加
 */

export interface TraceInfo {
  traceId: string;
  spanId: string;
  parentId?: string;
  flags: string;
}

export interface RequestContext {
  requestId: string;
  traceInfo: TraceInfo;
  startTime: Date;
}

// グローバルなリクエストコンテキスト管理（AsyncLocalStorage の代替）
let currentRequestContext: RequestContext | null = null;

export class TraceContext {
  /**
   * W3C TraceContext の traceparent ヘッダをパースする
   * 形式: 00-<trace-id>-<parent-id>-<trace-flags>
   */
  static parseTraceparent(traceparent?: string): TraceInfo {
    if (!traceparent) {
      return this.generateNewTrace();
    }

    const parts = traceparent.split('-');
    if (parts.length === 4 && parts[0] === '00') {
      const [, traceId, parentId, flags] = parts;

      // トレースIDとスパンIDの長さを検証
      if (traceId.length === 32 && parentId.length === 16) {
        return {
          traceId,
          spanId: this.generateSpanId(),
          parentId,
          flags,
        };
      }
    }

    // 無効な形式の場合は新しいトレースを生成
    return this.generateNewTrace();
  }

  /**
   * traceparent ヘッダ文字列を生成する
   */
  static generateTraceparent(traceInfo: TraceInfo): string {
    return `00-${traceInfo.traceId}-${traceInfo.spanId}-${traceInfo.flags}`;
  }

  /**
   * 新しいトレースを生成する
   */
  static generateNewTrace(): TraceInfo {
    return {
      traceId: this.generateTraceId(),
      spanId: this.generateSpanId(),
      flags: '01', // sampled
    };
  }

  /**
   * 新しいスパンを生成する（既存のトレースID内で）
   */
  static generateChildSpan(parentTrace: TraceInfo): TraceInfo {
    return {
      traceId: parentTrace.traceId,
      spanId: this.generateSpanId(),
      parentId: parentTrace.spanId,
      flags: parentTrace.flags,
    };
  }

  /**
   * 32文字のトレースIDを生成する
   */
  private static generateTraceId(): string {
    const uuid1 = crypto.randomUUID().replace(/-/g, '');
    const uuid2 = crypto.randomUUID().replace(/-/g, '');
    return (uuid1 + uuid2).substring(0, 32);
  }

  /**
   * 16文字のスパンIDを生成する
   */
  private static generateSpanId(): string {
    return crypto.randomUUID().replace(/-/g, '').substring(0, 16);
  }

  /**
   * リクエストIDを生成する（ログ用）
   */
  static generateRequestId(): string {
    return crypto.randomUUID();
  }

  /**
   * 新しいリクエストコンテキストを作成し、設定する
   */
  static createRequestContext(traceparent?: string): RequestContext {
    const traceInfo = this.parseTraceparent(traceparent);
    const requestContext: RequestContext = {
      requestId: this.generateRequestId(),
      traceInfo,
      startTime: new Date(),
    };

    currentRequestContext = requestContext;
    return requestContext;
  }

  /**
   * 現在のリクエストコンテキストを取得する
   */
  static getCurrentRequestContext(): RequestContext | null {
    return currentRequestContext;
  }

  /**
   * リクエストコンテキストをクリアする
   */
  static clearRequestContext(): void {
    currentRequestContext = null;
  }

  /**
   * 現在のコンテキストから新しい子スパンを作成する
   */
  static createChildSpanFromCurrent(): TraceInfo | null {
    if (!currentRequestContext) {
      return null;
    }

    return this.generateChildSpan(currentRequestContext.traceInfo);
  }

  /**
   * ログ用のトレースコンテキストを取得する
   */
  static getLogContext(): {
    requestId?: string;
    traceId?: string;
    spanId?: string;
  } {
    if (!currentRequestContext) {
      return {};
    }

    return {
      requestId: currentRequestContext.requestId,
      traceId: currentRequestContext.traceInfo.traceId,
      spanId: currentRequestContext.traceInfo.spanId,
    };
  }
}
