/**
 * BossEffectPool
 * 
 * ボス演出用のオブジェクトプール管理
 * エフェクトオブジェクトの再利用によりメモリ割り当てを最小化
 * 
 * 要件: 13.3 - ボス演出の効率的なオブジェクトプール管理
 */

import Phaser from 'phaser';

/**
 * プール可能なエフェクトオブジェクト
 */
export interface PoolableEffect {
  /** エフェクトをリセット */
  reset(): void;
  
  /** エフェクトを破棄 */
  destroy(): void;
  
  /** エフェクトがアクティブか */
  isActive(): boolean;
}

/**
 * エフェクトファクトリー関数
 */
export type EffectFactory<T extends PoolableEffect> = () => T;

/**
 * オブジェクトプール設定
 */
export interface PoolConfig {
  /** 初期プールサイズ */
  initialSize: number;
  
  /** 最大プールサイズ */
  maxSize: number;
  
  /** 自動拡張を有効化 */
  autoExpand: boolean;
  
  /** 自動縮小を有効化 */
  autoShrink: boolean;
  
  /** 縮小チェック間隔（ミリ秒） */
  shrinkCheckIntervalMs: number;
  
  /** 未使用オブジェクトの保持時間（ミリ秒） */
  unusedRetentionMs: number;
}

/**
 * デフォルトプール設定
 */
const DEFAULT_POOL_CONFIG: PoolConfig = {
  initialSize: 10,
  maxSize: 50,
  autoExpand: true,
  autoShrink: true,
  shrinkCheckIntervalMs: 5000,
  unusedRetentionMs: 10000,
};

/**
 * プール統計
 */
export interface PoolStats {
  totalCreated: number;
  totalAcquired: number;
  totalReleased: number;
  currentActive: number;
  currentInactive: number;
  currentSize: number;
  maxSizeReached: number;
}

/**
 * ObjectPool
 * 汎用オブジェクトプール
 */
class ObjectPool<T extends PoolableEffect> {
  private factory: EffectFactory<T>;
  private config: PoolConfig;
  private pool: T[];
  private active: Set<T>;
  private lastUsedTime: Map<T, number>;
  private shrinkTimer: NodeJS.Timeout | null;
  private stats: PoolStats;
  
  constructor(factory: EffectFactory<T>, config?: Partial<PoolConfig>) {
    this.factory = factory;
    this.config = { ...DEFAULT_POOL_CONFIG, ...config };
    this.pool = [];
    this.active = new Set();
    this.lastUsedTime = new Map();
    this.shrinkTimer = null;
    
    this.stats = {
      totalCreated: 0,
      totalAcquired: 0,
      totalReleased: 0,
      currentActive: 0,
      currentInactive: 0,
      currentSize: 0,
      maxSizeReached: 0,
    };
    
    // 初期プールを作成
    this.expandPool(this.config.initialSize);
    
    // 自動縮小を開始
    if (this.config.autoShrink) {
      this.startAutoShrink();
    }
  }
  
  /**
   * オブジェクトを取得
   * @returns プールされたオブジェクト
   */
  public acquire(): T {
    let obj: T;
    
    // プールから取得
    if (this.pool.length > 0) {
      obj = this.pool.pop()!;
    } else if (this.config.autoExpand && this.getTotalSize() < this.config.maxSize) {
      // プールが空で自動拡張が有効な場合は新規作成
      obj = this.createObject();
    } else {
      // プールが空で拡張できない場合はエラー
      throw new Error('Object pool exhausted and cannot expand');
    }
    
    // アクティブセットに追加
    this.active.add(obj);
    this.lastUsedTime.set(obj, Date.now());
    
    // 統計を更新
    this.stats.totalAcquired++;
    this.updateStats();
    
    return obj;
  }
  
  /**
   * オブジェクトを返却
   * @param obj 返却するオブジェクト
   */
  public release(obj: T): void {
    if (!this.active.has(obj)) {
      console.warn('Attempting to release object not in active set');
      return;
    }
    
    // オブジェクトをリセット
    obj.reset();
    
    // アクティブセットから削除
    this.active.delete(obj);
    
    // プールに返却
    this.pool.push(obj);
    this.lastUsedTime.set(obj, Date.now());
    
    // 統計を更新
    this.stats.totalReleased++;
    this.updateStats();
  }
  
  /**
   * すべてのアクティブオブジェクトを返却
   */
  public releaseAll(): void {
    const activeObjects = Array.from(this.active);
    activeObjects.forEach(obj => this.release(obj));
  }
  
  /**
   * プールを拡張
   * @param count 追加するオブジェクト数
   */
  private expandPool(count: number): void {
    const currentSize = this.getTotalSize();
    const availableSpace = this.config.maxSize - currentSize;
    const actualCount = Math.min(count, availableSpace);
    
    for (let i = 0; i < actualCount; i++) {
      const obj = this.createObject();
      this.pool.push(obj);
    }
    
    this.updateStats();
  }
  
  /**
   * プールを縮小
   */
  private shrinkPool(): void {
    const now = Date.now();
    const objectsToRemove: T[] = [];
    
    // 長時間未使用のオブジェクトを特定
    for (const obj of this.pool) {
      const lastUsed = this.lastUsedTime.get(obj) || 0;
      if (now - lastUsed > this.config.unusedRetentionMs) {
        objectsToRemove.push(obj);
      }
    }
    
    // オブジェクトを削除
    objectsToRemove.forEach(obj => {
      const index = this.pool.indexOf(obj);
      if (index !== -1) {
        this.pool.splice(index, 1);
        this.lastUsedTime.delete(obj);
        obj.destroy();
      }
    });
    
    if (objectsToRemove.length > 0) {
      console.log(`Shrunk pool by ${objectsToRemove.length} objects`);
      this.updateStats();
    }
  }
  
  /**
   * 自動縮小を開始
   */
  private startAutoShrink(): void {
    this.shrinkTimer = setInterval(() => {
      this.shrinkPool();
    }, this.config.shrinkCheckIntervalMs);
  }
  
  /**
   * 新しいオブジェクトを作成
   * @returns 新しいオブジェクト
   */
  private createObject(): T {
    const obj = this.factory();
    this.stats.totalCreated++;
    return obj;
  }
  
  /**
   * 統計を更新
   */
  private updateStats(): void {
    this.stats.currentActive = this.active.size;
    this.stats.currentInactive = this.pool.length;
    this.stats.currentSize = this.getTotalSize();
    this.stats.maxSizeReached = Math.max(this.stats.maxSizeReached, this.stats.currentSize);
  }
  
  /**
   * プールの総サイズを取得
   * @returns 総サイズ
   */
  public getTotalSize(): number {
    return this.active.size + this.pool.length;
  }
  
  /**
   * 統計を取得
   * @returns プール統計
   */
  public getStats(): PoolStats {
    return { ...this.stats };
  }
  
  /**
   * プールをクリア
   */
  public clear(): void {
    // すべてのアクティブオブジェクトを返却
    this.releaseAll();
    
    // プール内のすべてのオブジェクトを破棄
    this.pool.forEach(obj => obj.destroy());
    this.pool = [];
    this.lastUsedTime.clear();
    
    this.updateStats();
  }
  
  /**
   * プールを破棄
   */
  public destroy(): void {
    // タイマーを停止
    if (this.shrinkTimer) {
      clearInterval(this.shrinkTimer);
      this.shrinkTimer = null;
    }
    
    // プールをクリア
    this.clear();
  }
}

/**
 * BossEffectPool
 * ボス演出用のエフェクトプール管理
 */
export class BossEffectPool {
  private scene: Phaser.Scene;
  private pools: Map<string, ObjectPool<any>>;
  
  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.pools = new Map();
  }
  
  /**
   * エフェクトプールを登録
   * @param name プール名
   * @param factory エフェクトファクトリー
   * @param config プール設定
   */
  public registerPool<T extends PoolableEffect>(
    name: string,
    factory: EffectFactory<T>,
    config?: Partial<PoolConfig>
  ): void {
    if (this.pools.has(name)) {
      console.warn(`Pool '${name}' already exists`);
      return;
    }
    
    const pool = new ObjectPool(factory, config);
    this.pools.set(name, pool);
  }
  
  /**
   * エフェクトを取得
   * @param poolName プール名
   * @returns エフェクトオブジェクト
   */
  public acquire<T extends PoolableEffect>(poolName: string): T {
    const pool = this.pools.get(poolName);
    if (!pool) {
      throw new Error(`Pool '${poolName}' not found`);
    }
    
    return pool.acquire();
  }
  
  /**
   * エフェクトを返却
   * @param poolName プール名
   * @param effect エフェクトオブジェクト
   */
  public release(poolName: string, effect: PoolableEffect): void {
    const pool = this.pools.get(poolName);
    if (!pool) {
      console.warn(`Pool '${poolName}' not found`);
      return;
    }
    
    pool.release(effect);
  }
  
  /**
   * プールのすべてのアクティブオブジェクトを返却
   * @param poolName プール名
   */
  public releaseAll(poolName: string): void {
    const pool = this.pools.get(poolName);
    if (!pool) {
      console.warn(`Pool '${poolName}' not found`);
      return;
    }
    
    pool.releaseAll();
  }
  
  /**
   * すべてのプールのアクティブオブジェクトを返却
   */
  public releaseAllPools(): void {
    this.pools.forEach(pool => pool.releaseAll());
  }
  
  /**
   * プールの統計を取得
   * @param poolName プール名
   * @returns プール統計
   */
  public getPoolStats(poolName: string): PoolStats | null {
    const pool = this.pools.get(poolName);
    return pool ? pool.getStats() : null;
  }
  
  /**
   * すべてのプールの統計を取得
   * @returns プール名と統計のマップ
   */
  public getAllPoolStats(): Map<string, PoolStats> {
    const stats = new Map<string, PoolStats>();
    this.pools.forEach((pool, name) => {
      stats.set(name, pool.getStats());
    });
    return stats;
  }
  
  /**
   * プールをクリア
   * @param poolName プール名
   */
  public clearPool(poolName: string): void {
    const pool = this.pools.get(poolName);
    if (pool) {
      pool.clear();
    }
  }
  
  /**
   * すべてのプールをクリア
   */
  public clearAllPools(): void {
    this.pools.forEach(pool => pool.clear());
  }
  
  /**
   * プールを削除
   * @param poolName プール名
   */
  public removePool(poolName: string): void {
    const pool = this.pools.get(poolName);
    if (pool) {
      pool.destroy();
      this.pools.delete(poolName);
    }
  }
  
  /**
   * すべてのプールを破棄
   */
  public destroy(): void {
    this.pools.forEach(pool => pool.destroy());
    this.pools.clear();
  }
}
