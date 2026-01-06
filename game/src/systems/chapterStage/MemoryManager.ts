/**
 * メモリ管理システム
 * Memory Management System
 *
 * 不要データのクリーンアップとメモリリーク防止を提供します。
 * Provides cleanup of unused data and memory leak prevention.
 *
 * 要件: 10.3, 10.4
 */

/**
 * メモリ使用状況
 * Memory Usage Statistics
 */
export interface MemoryStats {
  /** 使用中のメモリ（推定値、バイト） */
  usedMemory: number;
  /** キャッシュサイズ */
  cacheSize: number;
  /** アクティブなリスナー数 */
  activeListeners: number;
  /** 最終クリーンアップ時刻 */
  lastCleanup: number;
}

/**
 * クリーンアップ可能なリソース
 * Cleanable Resource Interface
 */
export interface CleanableResource {
  /** リソースのクリーンアップ */
  cleanup(): void;
  /** リソースが使用中かどうか */
  isInUse(): boolean;
}

/**
 * メモリ管理クラス
 * Memory Manager Class
 */
export class MemoryManager {
  private static instance: MemoryManager | null = null;

  private resources: Map<string, CleanableResource> = new Map();
  private eventListeners: Map<string, Set<Function>> = new Map();
  private cleanupInterval: number | null = null;
  private lastCleanupTime: number = 0;

  /** 自動クリーンアップの間隔（ミリ秒） */
  private readonly AUTO_CLEANUP_INTERVAL = 60000; // 1分

  /** メモリ警告閾値（推定値、バイト） */
  private readonly MEMORY_WARNING_THRESHOLD = 100 * 1024 * 1024; // 100MB

  /**
   * プライベートコンストラクタ（シングルトン）
   * Private Constructor (Singleton)
   */
  private constructor() {
    this.log('MemoryManager initialized');
    this.startAutoCleanup();
  }

  /**
   * インスタンスの取得
   * Get Instance
   *
   * @returns MemoryManager インスタンス
   */
  public static getInstance(): MemoryManager {
    if (!MemoryManager.instance) {
      MemoryManager.instance = new MemoryManager();
    }
    return MemoryManager.instance;
  }

  /**
   * リソースの登録
   * Register Resource
   *
   * @param id - リソースID
   * @param resource - クリーンアップ可能なリソース
   */
  public registerResource(id: string, resource: CleanableResource): void {
    this.resources.set(id, resource);
    this.log(`Resource registered: ${id}`);
  }

  /**
   * リソースの登録解除
   * Unregister Resource
   *
   * @param id - リソースID
   */
  public unregisterResource(id: string): void {
    const resource = this.resources.get(id);
    if (resource) {
      resource.cleanup();
      this.resources.delete(id);
      this.log(`Resource unregistered: ${id}`);
    }
  }

  /**
   * イベントリスナーの追加
   * Add Event Listener
   *
   * @param eventName - イベント名
   * @param listener - リスナー関数
   */
  public addEventListener(eventName: string, listener: Function): void {
    if (!this.eventListeners.has(eventName)) {
      this.eventListeners.set(eventName, new Set());
    }
    this.eventListeners.get(eventName)!.add(listener);
  }

  /**
   * イベントリスナーの削除
   * Remove Event Listener
   *
   * @param eventName - イベント名
   * @param listener - リスナー関数
   */
  public removeEventListener(eventName: string, listener: Function): void {
    const listeners = this.eventListeners.get(eventName);
    if (listeners) {
      listeners.delete(listener);
      if (listeners.size === 0) {
        this.eventListeners.delete(eventName);
      }
    }
  }

  /**
   * 全イベントリスナーのクリア
   * Clear All Event Listeners
   *
   * @param eventName - イベント名（指定しない場合は全て）
   */
  public clearEventListeners(eventName?: string): void {
    if (eventName) {
      this.eventListeners.delete(eventName);
      this.log(`Event listeners cleared: ${eventName}`);
    } else {
      const count = this.eventListeners.size;
      this.eventListeners.clear();
      this.log(`All event listeners cleared (${count} events)`);
    }
  }

  /**
   * 未使用リソースのクリーンアップ
   * Cleanup Unused Resources
   *
   * @returns クリーンアップされたリソース数
   */
  public cleanupUnusedResources(): number {
    let cleanedCount = 0;

    this.resources.forEach((resource, id) => {
      if (!resource.isInUse()) {
        resource.cleanup();
        this.resources.delete(id);
        cleanedCount++;
        this.log(`Cleaned up unused resource: ${id}`);
      }
    });

    this.lastCleanupTime = Date.now();

    if (cleanedCount > 0) {
      this.log(`Cleanup completed: ${cleanedCount} resources cleaned`);
    }

    return cleanedCount;
  }

  /**
   * 章切り替え時のクリーンアップ
   * Cleanup on Chapter Switch
   *
   * 要件: 10.3 - 章を切り替える際に前章のデータを適切にクリーンアップ
   */
  public cleanupChapterData(): void {
    this.log('Cleaning up chapter data');

    // 全リソースをクリーンアップ
    this.resources.forEach((resource, id) => {
      resource.cleanup();
      this.log(`Cleaned up chapter resource: ${id}`);
    });
    this.resources.clear();

    // イベントリスナーをクリア
    this.clearEventListeners();

    // ガベージコレクションのヒント（ブラウザによっては無視される）
    if (global.gc) {
      global.gc();
      this.log('Manual garbage collection triggered');
    }

    this.lastCleanupTime = Date.now();
    this.log('Chapter data cleanup completed');
  }

  /**
   * メモリ使用状況の取得
   * Get Memory Statistics
   *
   * @returns メモリ使用状況
   */
  public getMemoryStats(): MemoryStats {
    // リソース数からメモリ使用量を推定
    const estimatedMemory = this.resources.size * 1024; // 1リソースあたり約1KB

    // アクティブなリスナー数をカウント
    let activeListeners = 0;
    this.eventListeners.forEach((listeners) => {
      activeListeners += listeners.size;
    });

    return {
      usedMemory: estimatedMemory,
      cacheSize: this.resources.size,
      activeListeners,
      lastCleanup: this.lastCleanupTime,
    };
  }

  /**
   * メモリ警告チェック
   * Check Memory Warning
   *
   * @returns メモリ使用量が閾値を超えている場合 true
   */
  public checkMemoryWarning(): boolean {
    const stats = this.getMemoryStats();
    const isWarning = stats.usedMemory > this.MEMORY_WARNING_THRESHOLD;

    if (isWarning) {
      this.logWarning(
        `Memory usage warning: ${(stats.usedMemory / 1024 / 1024).toFixed(2)}MB`
      );
    }

    return isWarning;
  }

  /**
   * 自動クリーンアップの開始
   * Start Auto Cleanup
   */
  private startAutoCleanup(): void {
    if (this.cleanupInterval !== null) {
      return;
    }

    this.cleanupInterval = window.setInterval(() => {
      this.log('Running auto cleanup');
      this.cleanupUnusedResources();

      // メモリ警告チェック
      if (this.checkMemoryWarning()) {
        this.cleanupChapterData();
      }
    }, this.AUTO_CLEANUP_INTERVAL);

    this.log('Auto cleanup started');
  }

  /**
   * 自動クリーンアップの停止
   * Stop Auto Cleanup
   */
  public stopAutoCleanup(): void {
    if (this.cleanupInterval !== null) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
      this.log('Auto cleanup stopped');
    }
  }

  /**
   * メモリリークの検出
   * Detect Memory Leaks
   *
   * @returns 潜在的なメモリリークの警告リスト
   */
  public detectMemoryLeaks(): string[] {
    const warnings: string[] = [];

    // 長時間使用されていないリソースをチェック
    const now = Date.now();
    const STALE_THRESHOLD = 5 * 60 * 1000; // 5分

    this.resources.forEach((resource, id) => {
      if (!resource.isInUse()) {
        warnings.push(`Unused resource detected: ${id}`);
      }
    });

    // 大量のイベントリスナーをチェック
    this.eventListeners.forEach((listeners, eventName) => {
      if (listeners.size > 100) {
        warnings.push(
          `Too many listeners for event '${eventName}': ${listeners.size}`
        );
      }
    });

    if (warnings.length > 0) {
      this.logWarning(`Memory leak warnings: ${warnings.length}`);
      warnings.forEach((warning) => this.logWarning(warning));
    }

    return warnings;
  }

  /**
   * 完全なクリーンアップ（破棄時）
   * Complete Cleanup (on Destroy)
   */
  public destroy(): void {
    this.log('Destroying MemoryManager');

    // 自動クリーンアップを停止
    this.stopAutoCleanup();

    // 全リソースをクリーンアップ
    this.resources.forEach((resource) => resource.cleanup());
    this.resources.clear();

    // 全イベントリスナーをクリア
    this.clearEventListeners();

    // 内部状態を完全にリセット
    this.lastCleanupTime = 0;

    // インスタンスをクリア
    MemoryManager.instance = null;

    this.log('MemoryManager destroyed');
  }

  /**
   * ログ出力
   * Log message
   *
   * @param message - ログメッセージ
   */
  private log(message: string): void {
    console.log(`[MemoryManager] ${message}`);
  }

  /**
   * 警告ログ出力
   * Log warning message
   *
   * @param message - 警告メッセージ
   */
  private logWarning(message: string): void {
    console.warn(`[MemoryManager] ${message}`);
  }
}

/**
 * 簡易的なクリーンアップ可能リソースの実装
 * Simple Cleanable Resource Implementation
 */
export class SimpleCleanableResource implements CleanableResource {
  private inUse: boolean = true;
  private cleanupCallback: (() => void) | null = null;

  /**
   * コンストラクタ
   * Constructor
   *
   * @param cleanupCallback - クリーンアップ時に呼ばれるコールバック
   */
  constructor(cleanupCallback?: () => void) {
    this.cleanupCallback = cleanupCallback || null;
  }

  /**
   * リソースのクリーンアップ
   * Cleanup Resource
   */
  public cleanup(): void {
    if (this.cleanupCallback) {
      this.cleanupCallback();
    }
    this.inUse = false;
  }

  /**
   * リソースが使用中かどうか
   * Check if Resource is in Use
   *
   * @returns 使用中の場合 true
   */
  public isInUse(): boolean {
    return this.inUse;
  }

  /**
   * 使用状態の設定
   * Set In Use State
   *
   * @param inUse - 使用中かどうか
   */
  public setInUse(inUse: boolean): void {
    this.inUse = inUse;
  }
}
