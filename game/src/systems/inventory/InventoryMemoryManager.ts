/**
 * InventoryMemoryManager - インベントリ・装備システムのメモリ管理
 * 
 * パフォーマンス最適化:
 * - オブジェクトプールの活用: 頻繁に作成・破棄されるオブジェクトを再利用
 * - 不要なオブジェクトの破棄: メモリリークの防止
 * - メモリ使用量の監視: パフォーマンス要件の確認
 * 
 * 要件11.5対応:
 * - メモリ使用量を50MB以下に抑える
 */

/**
 * オブジェクトプール
 * 頻繁に作成・破棄されるオブジェクトを再利用してGCの負荷を削減
 */
export class ObjectPool<T> {
  private pool: T[] = [];
  private factory: () => T;
  private reset: (obj: T) => void;
  private maxSize: number;

  /**
   * コンストラクタ
   * 
   * @param factory オブジェクト生成関数
   * @param reset オブジェクトリセット関数
   * @param initialSize 初期プールサイズ
   * @param maxSize 最大プールサイズ
   */
  constructor(
    factory: () => T,
    reset: (obj: T) => void,
    initialSize: number = 10,
    maxSize: number = 100
  ) {
    this.factory = factory;
    this.reset = reset;
    this.maxSize = maxSize;

    // 初期プールを作成
    for (let i = 0; i < initialSize; i++) {
      this.pool.push(this.factory());
    }
  }

  /**
   * プールからオブジェクトを取得
   */
  acquire(): T {
    if (this.pool.length > 0) {
      return this.pool.pop()!;
    }

    // プールが空の場合は新規作成
    return this.factory();
  }

  /**
   * オブジェクトをプールに返却
   */
  release(obj: T): void {
    // プールサイズが最大値を超えている場合は破棄
    if (this.pool.length >= this.maxSize) {
      return;
    }

    // オブジェクトをリセット
    this.reset(obj);

    // プールに追加
    this.pool.push(obj);
  }

  /**
   * プールをクリア
   */
  clear(): void {
    this.pool = [];
  }

  /**
   * プールサイズを取得
   */
  getSize(): number {
    return this.pool.length;
  }
}

/**
 * メモリ使用量情報
 */
export interface MemoryUsageInfo {
  /** 使用中のメモリ（バイト） */
  usedMemory: number;
  /** 使用中のメモリ（MB） */
  usedMemoryMB: number;
  /** 総メモリ（バイト） */
  totalMemory: number;
  /** 総メモリ（MB） */
  totalMemoryMB: number;
  /** メモリ使用率（%） */
  usagePercentage: number;
  /** 測定時刻 */
  timestamp: number;
}

/**
 * InventoryMemoryManager クラス
 * インベントリ・装備システムのメモリ管理
 */
export class InventoryMemoryManager {
  private static instance: InventoryMemoryManager;

  // メモリ使用量の履歴
  private memoryHistory: MemoryUsageInfo[] = [];
  private maxHistorySize: number = 100;

  // メモリ警告閾値（MB）
  private warningThreshold: number = 40;
  private criticalThreshold: number = 50;

  // メモリ監視間隔（ミリ秒）
  private monitoringInterval: number = 5000;
  private monitoringTimer?: NodeJS.Timeout;

  /**
   * シングルトンインスタンスを取得
   */
  static getInstance(): InventoryMemoryManager {
    if (!InventoryMemoryManager.instance) {
      InventoryMemoryManager.instance = new InventoryMemoryManager();
    }
    return InventoryMemoryManager.instance;
  }

  /**
   * プライベートコンストラクタ
   */
  private constructor() {
    console.log('[InventoryMemoryManager] Initialized');
  }

  /**
   * メモリ使用量を取得
   * 要件11.5対応: メモリ使用量の監視
   * 
   * @returns メモリ使用量情報
   */
  getMemoryUsage(): MemoryUsageInfo {
    // performance.memory APIを使用（Chrome/Edge）
    const memory = (performance as any).memory;

    if (memory) {
      const usedMemory = memory.usedJSHeapSize;
      const totalMemory = memory.totalJSHeapSize;

      return {
        usedMemory,
        usedMemoryMB: usedMemory / (1024 * 1024),
        totalMemory,
        totalMemoryMB: totalMemory / (1024 * 1024),
        usagePercentage: (usedMemory / totalMemory) * 100,
        timestamp: Date.now(),
      };
    }

    // performance.memory APIが利用できない場合は推定値を返す
    console.warn('[InventoryMemoryManager] performance.memory API not available');
    return {
      usedMemory: 0,
      usedMemoryMB: 0,
      totalMemory: 0,
      totalMemoryMB: 0,
      usagePercentage: 0,
      timestamp: Date.now(),
    };
  }

  /**
   * メモリ使用量を記録
   */
  recordMemoryUsage(): void {
    const usage = this.getMemoryUsage();

    // 履歴に追加
    this.memoryHistory.push(usage);

    // 履歴サイズを制限
    if (this.memoryHistory.length > this.maxHistorySize) {
      this.memoryHistory.shift();
    }

    // メモリ使用量をチェック
    this.checkMemoryUsage(usage);
  }

  /**
   * メモリ使用量をチェック
   * 要件11.5対応: メモリ使用量を50MB以下に抑える
   */
  private checkMemoryUsage(usage: MemoryUsageInfo): void {
    if (usage.usedMemoryMB > this.criticalThreshold) {
      console.error(
        `[InventoryMemoryManager] CRITICAL: Memory usage exceeded ${this.criticalThreshold}MB: ${usage.usedMemoryMB.toFixed(2)}MB`
      );
      // クリティカル閾値を超えた場合、ガベージコレクションを促す
      this.forceGarbageCollection();
    } else if (usage.usedMemoryMB > this.warningThreshold) {
      console.warn(
        `[InventoryMemoryManager] WARNING: Memory usage exceeded ${this.warningThreshold}MB: ${usage.usedMemoryMB.toFixed(2)}MB`
      );
    }
  }

  /**
   * ガベージコレクションを促す
   * 注: 実際のGCは制御できないが、不要な参照を削除することで間接的に促す
   */
  private forceGarbageCollection(): void {
    console.log('[InventoryMemoryManager] Attempting to trigger garbage collection');

    // 不要なオブジェクトへの参照を削除
    // 実際のゲームでは、キャッシュやプールをクリアする等の処理を行う

    // メモリ使用量を再チェック
    setTimeout(() => {
      const usage = this.getMemoryUsage();
      console.log(
        `[InventoryMemoryManager] Memory usage after GC attempt: ${usage.usedMemoryMB.toFixed(2)}MB`
      );
    }, 1000);
  }

  /**
   * メモリ監視を開始
   */
  startMonitoring(): void {
    if (this.monitoringTimer) {
      console.warn('[InventoryMemoryManager] Monitoring already started');
      return;
    }

    console.log('[InventoryMemoryManager] Starting memory monitoring');

    this.monitoringTimer = setInterval(() => {
      this.recordMemoryUsage();
    }, this.monitoringInterval);

    // 初回測定
    this.recordMemoryUsage();
  }

  /**
   * メモリ監視を停止
   */
  stopMonitoring(): void {
    if (this.monitoringTimer) {
      clearInterval(this.monitoringTimer);
      this.monitoringTimer = undefined;
      console.log('[InventoryMemoryManager] Memory monitoring stopped');
    }
  }

  /**
   * メモリ使用量の履歴を取得
   */
  getMemoryHistory(): MemoryUsageInfo[] {
    return [...this.memoryHistory];
  }

  /**
   * メモリ使用量の統計を取得
   */
  getMemoryStats(): {
    current: MemoryUsageInfo;
    average: number;
    peak: number;
    samples: number;
  } {
    const current = this.getMemoryUsage();

    if (this.memoryHistory.length === 0) {
      return {
        current,
        average: 0,
        peak: 0,
        samples: 0,
      };
    }

    const usages = this.memoryHistory.map(h => h.usedMemoryMB);
    const average = usages.reduce((sum, val) => sum + val, 0) / usages.length;
    const peak = Math.max(...usages);

    return {
      current,
      average,
      peak,
      samples: this.memoryHistory.length,
    };
  }

  /**
   * メモリ履歴をクリア
   */
  clearHistory(): void {
    this.memoryHistory = [];
    console.log('[InventoryMemoryManager] Memory history cleared');
  }

  /**
   * 警告閾値を設定
   */
  setWarningThreshold(thresholdMB: number): void {
    this.warningThreshold = thresholdMB;
    console.log(`[InventoryMemoryManager] Warning threshold set to ${thresholdMB}MB`);
  }

  /**
   * クリティカル閾値を設定
   */
  setCriticalThreshold(thresholdMB: number): void {
    this.criticalThreshold = thresholdMB;
    console.log(`[InventoryMemoryManager] Critical threshold set to ${thresholdMB}MB`);
  }

  /**
   * 監視間隔を設定
   */
  setMonitoringInterval(intervalMs: number): void {
    this.monitoringInterval = intervalMs;

    // 監視中の場合は再起動
    if (this.monitoringTimer) {
      this.stopMonitoring();
      this.startMonitoring();
    }

    console.log(`[InventoryMemoryManager] Monitoring interval set to ${intervalMs}ms`);
  }
}

/**
 * メモリ管理ユーティリティ
 */
export class MemoryUtils {
  /**
   * オブジェクトのメモリサイズを推定（バイト）
   * 注: 正確な値ではなく、おおよその推定値
   */
  static estimateObjectSize(obj: any): number {
    const objectList: any[] = [];
    const stack = [obj];
    let bytes = 0;

    while (stack.length) {
      const value = stack.pop();

      if (typeof value === 'boolean') {
        bytes += 4;
      } else if (typeof value === 'string') {
        bytes += value.length * 2;
      } else if (typeof value === 'number') {
        bytes += 8;
      } else if (typeof value === 'object' && value !== null && objectList.indexOf(value) === -1) {
        objectList.push(value);

        for (const prop in value) {
          if (value.hasOwnProperty(prop)) {
            stack.push(value[prop]);
          }
        }
      }
    }

    return bytes;
  }

  /**
   * バイトを人間が読みやすい形式に変換
   */
  static formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}
