/**
 * VictoryConditionPerformanceManager
 * 
 * ボス戦・勝利条件システムのパフォーマンス最適化を管理
 * 
 * 主な機能:
 * - 勝利・敗北条件判定のキャッシュ
 * - 目標進捗更新のバッチ処理
 * - 報酬計算の遅延評価
 * - メモリリーク防止
 * 
 * 要件: 13.1, 13.2, 13.3, 13.4, 13.5
 */

import { GameState } from '../../types/gameplay';
import { VictoryCheckResult, DefeatCheckResult } from '../../types/victory';

/**
 * キャッシュエントリ
 */
interface CacheEntry<T> {
  value: T;
  timestamp: number;
  turn: number;
}

/**
 * バッチ更新エントリ
 */
interface BatchUpdateEntry {
  objectiveId: string;
  current: number;
  target?: number;
  timestamp: number;
}

/**
 * パフォーマンス統計
 */
export interface PerformanceStats {
  cacheHits: number;
  cacheMisses: number;
  batchUpdatesProcessed: number;
  memoryUsage: number;
  lastCleanupTime: number;
}

/**
 * パフォーマンスマネージャー設定
 */
export interface PerformanceManagerConfig {
  /** キャッシュの有効期限（ミリ秒） */
  cacheExpirationMs: number;
  
  /** バッチ更新の最大サイズ */
  maxBatchSize: number;
  
  /** バッチ更新のフラッシュ間隔（ミリ秒） */
  batchFlushIntervalMs: number;
  
  /** メモリクリーンアップの間隔（ミリ秒） */
  memoryCleanupIntervalMs: number;
  
  /** デバッグログを有効化 */
  enableDebugLogs: boolean;
}

/**
 * デフォルト設定
 */
const DEFAULT_CONFIG: PerformanceManagerConfig = {
  cacheExpirationMs: 1000, // 1秒
  maxBatchSize: 50,
  batchFlushIntervalMs: 100, // 100ms
  memoryCleanupIntervalMs: 5000, // 5秒
  enableDebugLogs: false,
};


/**
 * VictoryConditionPerformanceManager
 * パフォーマンス最適化とメモリ管理を担当
 */
export class VictoryConditionPerformanceManager {
  private config: PerformanceManagerConfig;
  
  // キャッシュ
  private victoryCheckCache: Map<string, CacheEntry<VictoryCheckResult>>;
  private defeatCheckCache: Map<string, CacheEntry<DefeatCheckResult>>;
  private rewardCalculationCache: Map<string, CacheEntry<any>>;
  
  // バッチ処理
  private batchUpdateQueue: BatchUpdateEntry[];
  private batchFlushTimer: NodeJS.Timeout | null;
  
  // メモリ管理
  private memoryCleanupTimer: NodeJS.Timeout | null;
  
  // 統計
  private stats: PerformanceStats;
  
  constructor(config?: Partial<PerformanceManagerConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    
    // キャッシュの初期化
    this.victoryCheckCache = new Map();
    this.defeatCheckCache = new Map();
    this.rewardCalculationCache = new Map();
    
    // バッチ処理の初期化
    this.batchUpdateQueue = [];
    this.batchFlushTimer = null;
    
    // メモリ管理の初期化
    this.memoryCleanupTimer = null;
    
    // 統計の初期化
    this.stats = {
      cacheHits: 0,
      cacheMisses: 0,
      batchUpdatesProcessed: 0,
      memoryUsage: 0,
      lastCleanupTime: Date.now(),
    };
    
    // 定期的なメモリクリーンアップを開始
    this.startMemoryCleanup();
    
    this.log('PerformanceManager initialized');
  }
  
  // ========== 勝利・敗北条件判定のキャッシュ（要件13.1） ==========
  
  /**
   * 勝利条件判定結果をキャッシュから取得
   * @param gameState ゲーム状態
   * @returns キャッシュされた結果、またはnull
   */
  public getCachedVictoryCheck(gameState: GameState): VictoryCheckResult | null {
    const cacheKey = this.generateGameStateKey(gameState);
    const cached = this.victoryCheckCache.get(cacheKey);
    
    if (cached && this.isCacheValid(cached, gameState.currentTurn)) {
      this.stats.cacheHits++;
      this.log(`Victory check cache hit: ${cacheKey}`);
      return cached.value;
    }
    
    this.stats.cacheMisses++;
    return null;
  }
  
  /**
   * 勝利条件判定結果をキャッシュに保存
   * @param gameState ゲーム状態
   * @param result 判定結果
   */
  public cacheVictoryCheck(gameState: GameState, result: VictoryCheckResult): void {
    const cacheKey = this.generateGameStateKey(gameState);
    this.victoryCheckCache.set(cacheKey, {
      value: result,
      timestamp: Date.now(),
      turn: gameState.currentTurn,
    });
    
    this.log(`Victory check cached: ${cacheKey}`);
  }
  
  /**
   * 敗北条件判定結果をキャッシュから取得
   * @param gameState ゲーム状態
   * @returns キャッシュされた結果、またはnull
   */
  public getCachedDefeatCheck(gameState: GameState): DefeatCheckResult | null {
    const cacheKey = this.generateGameStateKey(gameState);
    const cached = this.defeatCheckCache.get(cacheKey);
    
    if (cached && this.isCacheValid(cached, gameState.currentTurn)) {
      this.stats.cacheHits++;
      this.log(`Defeat check cache hit: ${cacheKey}`);
      return cached.value;
    }
    
    this.stats.cacheMisses++;
    return null;
  }
  
  /**
   * 敗北条件判定結果をキャッシュに保存
   * @param gameState ゲーム状態
   * @param result 判定結果
   */
  public cacheDefeatCheck(gameState: GameState, result: DefeatCheckResult): void {
    const cacheKey = this.generateGameStateKey(gameState);
    this.defeatCheckCache.set(cacheKey, {
      value: result,
      timestamp: Date.now(),
      turn: gameState.currentTurn,
    });
    
    this.log(`Defeat check cached: ${cacheKey}`);
  }
  
  /**
   * ゲーム状態からキャッシュキーを生成
   * @param gameState ゲーム状態
   * @returns キャッシュキー
   */
  private generateGameStateKey(gameState: GameState): string {
    return `turn_${gameState.currentTurn}_phase_${gameState.phase}_player_${gameState.activePlayer}`;
  }
  
  /**
   * キャッシュが有効かチェック
   * @param entry キャッシュエントリ
   * @param currentTurn 現在のターン
   * @returns 有効な場合true
   */
  private isCacheValid<T>(entry: CacheEntry<T>, currentTurn: number): boolean {
    const now = Date.now();
    const isExpired = now - entry.timestamp > this.config.cacheExpirationMs;
    const isSameTurn = entry.turn === currentTurn;
    
    return !isExpired && isSameTurn;
  }
  
  /**
   * 判定キャッシュをクリア
   */
  public clearConditionCache(): void {
    this.victoryCheckCache.clear();
    this.defeatCheckCache.clear();
    this.log('Condition cache cleared');
  }
  
  // ========== 目標進捗更新のバッチ処理（要件13.2） ==========
  
  /**
   * 目標進捗更新をバッチキューに追加
   * @param objectiveId 目標ID
   * @param current 現在値
   * @param target 目標値（オプション）
   */
  public queueObjectiveUpdate(objectiveId: string, current: number, target?: number): void {
    this.batchUpdateQueue.push({
      objectiveId,
      current,
      target,
      timestamp: Date.now(),
    });
    
    // バッチサイズが最大に達したら即座にフラッシュ
    if (this.batchUpdateQueue.length >= this.config.maxBatchSize) {
      this.flushBatchUpdates();
    } else if (!this.batchFlushTimer) {
      // タイマーが設定されていない場合は設定
      this.batchFlushTimer = setTimeout(() => {
        this.flushBatchUpdates();
      }, this.config.batchFlushIntervalMs);
    }
  }
  
  /**
   * バッチ更新をフラッシュ
   * @returns 処理された更新の配列
   */
  public flushBatchUpdates(): BatchUpdateEntry[] {
    if (this.batchUpdateQueue.length === 0) {
      return [];
    }
    
    // タイマーをクリア
    if (this.batchFlushTimer) {
      clearTimeout(this.batchFlushTimer);
      this.batchFlushTimer = null;
    }
    
    // キューをコピーしてクリア
    const updates = [...this.batchUpdateQueue];
    this.batchUpdateQueue = [];
    
    // 統計を更新
    this.stats.batchUpdatesProcessed += updates.length;
    
    this.log(`Flushed ${updates.length} batch updates`);
    
    return updates;
  }
  
  /**
   * バッチキューのサイズを取得
   * @returns キューのサイズ
   */
  public getBatchQueueSize(): number {
    return this.batchUpdateQueue.length;
  }
  
  // ========== 報酬計算の遅延評価（要件13.4） ==========
  
  /**
   * 報酬計算結果をキャッシュから取得
   * @param stageId ステージID
   * @param performanceHash パフォーマンスハッシュ
   * @returns キャッシュされた結果、またはnull
   */
  public getCachedRewardCalculation(stageId: string, performanceHash: string): any | null {
    const cacheKey = `${stageId}_${performanceHash}`;
    const cached = this.rewardCalculationCache.get(cacheKey);
    
    if (cached) {
      this.stats.cacheHits++;
      this.log(`Reward calculation cache hit: ${cacheKey}`);
      return cached.value;
    }
    
    this.stats.cacheMisses++;
    return null;
  }
  
  /**
   * 報酬計算結果をキャッシュに保存
   * @param stageId ステージID
   * @param performanceHash パフォーマンスハッシュ
   * @param result 計算結果
   */
  public cacheRewardCalculation(stageId: string, performanceHash: string, result: any): void {
    const cacheKey = `${stageId}_${performanceHash}`;
    this.rewardCalculationCache.set(cacheKey, {
      value: result,
      timestamp: Date.now(),
      turn: 0, // 報酬計算はターンに依存しない
    });
    
    this.log(`Reward calculation cached: ${cacheKey}`);
  }
  
  /**
   * パフォーマンスデータからハッシュを生成
   * @param performance パフォーマンスデータ
   * @returns ハッシュ文字列
   */
  public generatePerformanceHash(performance: any): string {
    return `t${performance.turnsUsed}_l${performance.unitsLost}_e${performance.enemiesDefeated}_b${performance.bossesDefeated}_r${performance.recruitmentSuccesses}`;
  }
  
  /**
   * 報酬計算キャッシュをクリア
   */
  public clearRewardCache(): void {
    this.rewardCalculationCache.clear();
    this.log('Reward cache cleared');
  }
  
  // ========== メモリリーク防止（要件13.5） ==========
  
  /**
   * 定期的なメモリクリーンアップを開始
   */
  private startMemoryCleanup(): void {
    this.memoryCleanupTimer = setInterval(() => {
      this.performMemoryCleanup();
    }, this.config.memoryCleanupIntervalMs);
  }
  
  /**
   * メモリクリーンアップを実行
   */
  public performMemoryCleanup(): void {
    const now = Date.now();
    
    // 期限切れのキャッシュエントリを削除
    this.cleanupExpiredCache(this.victoryCheckCache);
    this.cleanupExpiredCache(this.defeatCheckCache);
    this.cleanupExpiredCache(this.rewardCalculationCache);
    
    // 統計を更新
    this.stats.lastCleanupTime = now;
    this.stats.memoryUsage = this.estimateMemoryUsage();
    
    this.log(`Memory cleanup completed. Estimated usage: ${this.stats.memoryUsage} bytes`);
  }
  
  /**
   * 期限切れのキャッシュエントリを削除
   * @param cache キャッシュマップ
   */
  private cleanupExpiredCache<T>(cache: Map<string, CacheEntry<T>>): void {
    const now = Date.now();
    const keysToDelete: string[] = [];
    
    cache.forEach((entry, key) => {
      if (now - entry.timestamp > this.config.cacheExpirationMs) {
        keysToDelete.push(key);
      }
    });
    
    keysToDelete.forEach(key => cache.delete(key));
    
    if (keysToDelete.length > 0) {
      this.log(`Cleaned up ${keysToDelete.length} expired cache entries`);
    }
  }
  
  /**
   * メモリ使用量を推定
   * @returns 推定メモリ使用量（バイト）
   */
  private estimateMemoryUsage(): number {
    // 簡易的な推定（実際のメモリ使用量とは異なる）
    const victoryCheckSize = this.victoryCheckCache.size * 1024; // 1KB per entry
    const defeatCheckSize = this.defeatCheckCache.size * 1024;
    const rewardCalcSize = this.rewardCalculationCache.size * 2048; // 2KB per entry
    const batchQueueSize = this.batchUpdateQueue.length * 256; // 256 bytes per entry
    
    return victoryCheckSize + defeatCheckSize + rewardCalcSize + batchQueueSize;
  }
  
  /**
   * すべてのキ���ッシュとキューをクリア
   */
  public clearAll(): void {
    this.clearConditionCache();
    this.clearRewardCache();
    this.batchUpdateQueue = [];
    
    if (this.batchFlushTimer) {
      clearTimeout(this.batchFlushTimer);
      this.batchFlushTimer = null;
    }
    
    this.log('All caches and queues cleared');
  }
  
  // ========== 統計とモニタリング ==========
  
  /**
   * パフォーマンス統計を取得
   * @returns パフォーマンス統計
   */
  public getStats(): PerformanceStats {
    return { ...this.stats };
  }
  
  /**
   * キャッシュヒット率を取得
   * @returns ヒット率（0-1）
   */
  public getCacheHitRate(): number {
    const total = this.stats.cacheHits + this.stats.cacheMisses;
    return total > 0 ? this.stats.cacheHits / total : 0;
  }
  
  /**
   * 統計をリセット
   */
  public resetStats(): void {
    this.stats = {
      cacheHits: 0,
      cacheMisses: 0,
      batchUpdatesProcessed: 0,
      memoryUsage: this.estimateMemoryUsage(),
      lastCleanupTime: Date.now(),
    };
    
    this.log('Stats reset');
  }
  
  /**
   * デバッグ情報を取得
   * @returns デバッグ情報
   */
  public getDebugInfo(): any {
    return {
      config: this.config,
      stats: this.stats,
      cacheHitRate: this.getCacheHitRate(),
      caches: {
        victoryCheck: this.victoryCheckCache.size,
        defeatCheck: this.defeatCheckCache.size,
        rewardCalculation: this.rewardCalculationCache.size,
      },
      batchQueue: {
        size: this.batchUpdateQueue.length,
        maxSize: this.config.maxBatchSize,
      },
    };
  }
  
  // ========== リソース解放 ==========
  
  /**
   * リソースを解放
   */
  public destroy(): void {
    // タイマーを停止
    if (this.batchFlushTimer) {
      clearTimeout(this.batchFlushTimer);
      this.batchFlushTimer = null;
    }
    
    if (this.memoryCleanupTimer) {
      clearInterval(this.memoryCleanupTimer);
      this.memoryCleanupTimer = null;
    }
    
    // すべてのキャッシュとキューをクリア
    this.clearAll();
    
    this.log('PerformanceManager destroyed');
  }
  
  // ========== ユーティリティ ==========
  
  /**
   * ログ出力
   * @param message メッセージ
   */
  private log(message: string): void {
    if (this.config.enableDebugLogs) {
      console.log(`[VictoryConditionPerformanceManager] ${message}`);
    }
  }
}
