/**
 * 章データローダー - データ読み込みの最適化
 * Chapter Data Loader - Optimized Data Loading
 *
 * 遅延読み込みとキャッシュ機構を提供します。
 * Provides lazy loading and caching mechanisms.
 *
 * 要件: 10.1, 10.2
 */

import { ChapterData, StageMetadata } from '../../types/chapterStage';

/**
 * キャッシュエントリ
 * Cache Entry
 */
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  accessCount: number;
}

/**
 * ローダー設定
 * Loader Configuration
 */
interface LoaderConfig {
  /** キャッシュの有効期限（ミリ秒） */
  cacheExpiration: number;
  /** 最大キャッシュサイズ */
  maxCacheSize: number;
  /** プリロードを有効にするか */
  enablePreload: boolean;
}

/**
 * 章データローダークラス
 * Chapter Data Loader Class
 */
export class ChapterDataLoader {
  private static readonly DEFAULT_CONFIG: LoaderConfig = {
    cacheExpiration: 5 * 60 * 1000, // 5分
    maxCacheSize: 10,
    enablePreload: true,
  };

  private chapterCache: Map<string, CacheEntry<ChapterData>> = new Map();
  private stageCache: Map<string, CacheEntry<StageMetadata>> = new Map();
  private loadingPromises: Map<string, Promise<ChapterData>> = new Map();
  private config: LoaderConfig;

  /**
   * コンストラクタ
   * Constructor
   *
   * @param config - ローダー設定（オプション）
   */
  constructor(config?: Partial<LoaderConfig>) {
    this.config = { ...ChapterDataLoader.DEFAULT_CONFIG, ...config };
    this.log('ChapterDataLoader initialized', this.config);
  }

  /**
   * 章データの読み込み（キャッシュ付き）
   * Load chapter data with caching
   *
   * @param chapterId - 章ID
   * @returns 章データ
   */
  public async loadChapterData(chapterId: string): Promise<ChapterData> {
    // キャッシュチェック
    const cached = this.getFromCache(chapterId);
    if (cached) {
      this.log(`Cache hit for chapter: ${chapterId}`);
      return cached;
    }

    // 既に読み込み中かチェック
    const existingPromise = this.loadingPromises.get(chapterId);
    if (existingPromise) {
      this.log(`Waiting for existing load: ${chapterId}`);
      return existingPromise;
    }

    // 新規読み込み
    const loadPromise = this.fetchChapterData(chapterId);
    this.loadingPromises.set(chapterId, loadPromise);

    try {
      const data = await loadPromise;
      this.addToCache(chapterId, data);
      return data;
    } finally {
      this.loadingPromises.delete(chapterId);
    }
  }

  /**
   * 章データの実際の読み込み
   * Fetch chapter data from server
   *
   * @param chapterId - 章ID
   * @returns 章データ
   */
  private async fetchChapterData(chapterId: string): Promise<ChapterData> {
    this.log(`Fetching chapter data: ${chapterId}`);
    const startTime = performance.now();

    try {
      const response = await fetch(`/data/chapters/${chapterId}.json`);

      if (!response.ok) {
        throw new Error(`Failed to load chapter: ${response.status}`);
      }

      const data = await response.json();

      const loadTime = performance.now() - startTime;
      this.log(`Chapter loaded in ${loadTime.toFixed(2)}ms: ${chapterId}`);

      return data;
    } catch (error) {
      this.logError(`Failed to fetch chapter data: ${chapterId}`, error);
      throw error;
    }
  }

  /**
   * 複数の章データをプリロード
   * Preload multiple chapter data
   *
   * @param chapterIds - 章IDリスト
   */
  public async preloadChapters(chapterIds: string[]): Promise<void> {
    if (!this.config.enablePreload) {
      return;
    }

    this.log(`Preloading ${chapterIds.length} chapters`);

    const promises = chapterIds.map((id) => this.loadChapterData(id).catch((error) => {
      this.logError(`Failed to preload chapter: ${id}`, error);
      return null;
    }));

    await Promise.all(promises);
    this.log('Preload completed');
  }

  /**
   * ステージメタデータの読み込み（遅延読み込み）
   * Load stage metadata with lazy loading
   *
   * @param stageId - ステージID
   * @param chapterId - 章ID
   * @returns ステージメタデータ
   */
  public async loadStageMetadata(
    stageId: string,
    chapterId: string
  ): Promise<StageMetadata | null> {
    // ステージキャッシュチェック
    const cached = this.stageCache.get(stageId);
    if (cached && !this.isCacheExpired(cached)) {
      cached.accessCount++;
      return cached.data;
    }

    // 章データから取得
    try {
      const chapterData = await this.loadChapterData(chapterId);
      const stage = chapterData.stages.find((s) => s.id === stageId);

      if (stage) {
        // ステージキャッシュに追加
        this.stageCache.set(stageId, {
          data: stage,
          timestamp: Date.now(),
          accessCount: 1,
        });
        return stage;
      }

      return null;
    } catch (error) {
      this.logError(`Failed to load stage metadata: ${stageId}`, error);
      return null;
    }
  }

  /**
   * キャッシュから取得
   * Get from cache
   *
   * @param chapterId - 章ID
   * @returns キャッシュされた章データ、または null
   */
  private getFromCache(chapterId: string): ChapterData | null {
    const entry = this.chapterCache.get(chapterId);

    if (!entry) {
      return null;
    }

    // キャッシュの有効期限チェック
    if (this.isCacheExpired(entry)) {
      this.chapterCache.delete(chapterId);
      return null;
    }

    // アクセスカウントを増やす
    entry.accessCount++;
    return entry.data;
  }

  /**
   * キャッシュに追加
   * Add to cache
   *
   * @param chapterId - 章ID
   * @param data - 章データ
   */
  private addToCache(chapterId: string, data: ChapterData): void {
    // キャッシュサイズチェック
    if (this.chapterCache.size >= this.config.maxCacheSize) {
      this.evictLeastUsedCache();
    }

    this.chapterCache.set(chapterId, {
      data,
      timestamp: Date.now(),
      accessCount: 1,
    });

    this.log(`Added to cache: ${chapterId} (cache size: ${this.chapterCache.size})`);
  }

  /**
   * キャッシュの有効期限チェック
   * Check if cache is expired
   *
   * @param entry - キャッシュエントリ
   * @returns 期限切れの場合 true
   */
  private isCacheExpired<T>(entry: CacheEntry<T>): boolean {
    const age = Date.now() - entry.timestamp;
    return age > this.config.cacheExpiration;
  }

  /**
   * 最も使用されていないキャッシュを削除
   * Evict least used cache entry
   */
  private evictLeastUsedCache(): void {
    let leastUsedKey: string | null = null;
    let leastAccessCount = Infinity;

    this.chapterCache.forEach((entry, key) => {
      if (entry.accessCount < leastAccessCount) {
        leastAccessCount = entry.accessCount;
        leastUsedKey = key;
      }
    });

    if (leastUsedKey) {
      this.chapterCache.delete(leastUsedKey);
      this.log(`Evicted from cache: ${leastUsedKey}`);
    }
  }

  /**
   * キャッシュのクリア
   * Clear cache
   *
   * @param chapterId - 章ID（指定しない場合は全てクリア）
   */
  public clearCache(chapterId?: string): void {
    if (chapterId) {
      this.chapterCache.delete(chapterId);
      this.log(`Cache cleared for chapter: ${chapterId}`);
    } else {
      this.chapterCache.clear();
      this.stageCache.clear();
      this.log('All cache cleared');
    }
  }

  /**
   * キャッシュ統計の取得
   * Get cache statistics
   *
   * @returns キャッシュ統計
   */
  public getCacheStats(): {
    chapterCacheSize: number;
    stageCacheSize: number;
    totalAccessCount: number;
  } {
    let totalAccessCount = 0;

    this.chapterCache.forEach((entry) => {
      totalAccessCount += entry.accessCount;
    });

    return {
      chapterCacheSize: this.chapterCache.size,
      stageCacheSize: this.stageCache.size,
      totalAccessCount,
    };
  }

  /**
   * ログ出力
   * Log message
   *
   * @param message - ログメッセージ
   * @param data - 追加データ（オプション）
   */
  private log(message: string, data?: unknown): void {
    if (data) {
      console.log(`[ChapterDataLoader] ${message}`, data);
    } else {
      console.log(`[ChapterDataLoader] ${message}`);
    }
  }

  /**
   * エラーログ出力
   * Log error message
   *
   * @param message - エラーメッセージ
   * @param error - エラーオブジェクト
   */
  private logError(message: string, error: unknown): void {
    console.error(`[ChapterDataLoader] ${message}`, error);
  }
}
