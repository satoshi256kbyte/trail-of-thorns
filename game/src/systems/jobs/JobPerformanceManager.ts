/**
 * JobPerformanceManager - 職業システムのパフォーマンス最適化とメモリ管理
 * 
 * このクラスは職業データのキャッシュ最適化、能力値計算の最適化、
 * UI更新の最適化、メモリリーク防止、オブジェクトプールの活用を行います。
 * 要件8.1-8.5に対応した機能を提供します。
 */

import {
    JobData,
    StatModifiers,
    CharacterJobData,
    JobSystemError,
    JobCategory
} from '../../types/job';
import { Unit } from '../../types/gameplay';
import { Job } from './Job';

/**
 * パフォーマンス監視メトリクス
 */
export interface PerformanceMetrics {
    cacheHitRate: number;
    averageCalculationTime: number;
    memoryUsage: number;
    objectPoolUtilization: number;
    uiUpdateFrequency: number;
    lastOptimizationTime: number;
}

/**
 * キャッシュ設定
 */
export interface CacheConfig {
    maxCacheSize: number;
    ttlMs: number;
    enableLRU: boolean;
    preloadCommonData: boolean;
}

/**
 * オブジェクトプール設定
 */
export interface ObjectPoolConfig {
    initialSize: number;
    maxSize: number;
    growthFactor: number;
    shrinkThreshold: number;
}

/**
 * キャッシュエントリ
 */
interface CacheEntry<T> {
    data: T;
    timestamp: number;
    accessCount: number;
    lastAccessed: number;
}

/**
 * 計算結果キャッシュ
 */
interface CalculationCache {
    statModifiers: Map<string, CacheEntry<StatModifiers>>;
    skillLists: Map<string, CacheEntry<string[]>>;
    rankUpRequirements: Map<string, CacheEntry<any>>;
    jobCompatibility: Map<string, CacheEntry<number>>;
}

/**
 * UI更新バッチ
 */
interface UIUpdateBatch {
    characterIds: Set<string>;
    updateTypes: Set<string>;
    priority: number;
    scheduledTime: number;
}

/**
 * 職業システムパフォーマンス管理クラス
 */
export class JobPerformanceManager {
    private cache: CalculationCache;
    private objectPools: Map<string, any[]>;
    private metrics: PerformanceMetrics;
    private config: {
        cache: CacheConfig;
        objectPool: ObjectPoolConfig;
    };
    private uiUpdateQueue: UIUpdateBatch[];
    private performanceTimer: Map<string, number>;
    private memoryWatcher: NodeJS.Timeout | null = null;

    constructor(
        cacheConfig: Partial<CacheConfig> = {},
        poolConfig: Partial<ObjectPoolConfig> = {}
    ) {
        this.cache = {
            statModifiers: new Map(),
            skillLists: new Map(),
            rankUpRequirements: new Map(),
            jobCompatibility: new Map()
        };

        this.objectPools = new Map();
        this.uiUpdateQueue = [];
        this.performanceTimer = new Map();

        this.config = {
            cache: {
                maxCacheSize: 1000,
                ttlMs: 300000, // 5分
                enableLRU: true,
                preloadCommonData: true,
                ...cacheConfig
            },
            objectPool: {
                initialSize: 10,
                maxSize: 100,
                growthFactor: 1.5,
                shrinkThreshold: 0.3,
                ...poolConfig
            }
        };

        this.metrics = {
            cacheHitRate: 0,
            averageCalculationTime: 0,
            memoryUsage: 0,
            objectPoolUtilization: 0,
            uiUpdateFrequency: 0,
            lastOptimizationTime: Date.now()
        };

        this.initializeObjectPools();
        this.startMemoryWatcher();
    }

    /**
     * オブジェクトプールを初期化
     * 要件8.3: メモリ使用量の適切な管理
     */
    private initializeObjectPools(): void {
        const poolTypes = [
            'StatModifiers',
            'JobChangeResult',
            'RankUpResult',
            'JobHistoryEntry',
            'UIUpdateBatch'
        ];

        poolTypes.forEach(type => {
            this.objectPools.set(type, []);
            this.expandPool(type, this.config.objectPool.initialSize);
        });
    }

    /**
     * オブジェクトプールを拡張
     * 要件8.3: メモリ使用量の適切な管理
     */
    private expandPool(type: string, count: number): void {
        const pool = this.objectPools.get(type);
        if (!pool) return;

        for (let i = 0; i < count; i++) {
            pool.push(this.createPoolObject(type));
        }
    }

    /**
     * プールオブジェクトを作成
     */
    private createPoolObject(type: string): any {
        switch (type) {
            case 'StatModifiers':
                return {
                    hp: 0,
                    mp: 0,
                    attack: 0,
                    defense: 0,
                    speed: 0,
                    skill: 0,
                    luck: 0
                };
            case 'JobChangeResult':
                return {
                    success: false,
                    oldJobId: '',
                    newJobId: '',
                    characterId: '',
                    timestamp: 0,
                    changes: null
                };
            case 'RankUpResult':
                return {
                    success: false,
                    characterId: '',
                    jobId: '',
                    oldRank: 0,
                    newRank: 0,
                    roseEssenceUsed: 0,
                    newSkills: [],
                    statChanges: null,
                    timestamp: 0
                };
            case 'UIUpdateBatch':
                return {
                    characterIds: new Set(),
                    updateTypes: new Set(),
                    priority: 0,
                    scheduledTime: 0
                };
            default:
                return {};
        }
    }

    /**
     * プールからオブジェクトを取得
     * 要件8.3: メモリ使用量の適切な管理
     */
    getFromPool<T>(type: string): T {
        const pool = this.objectPools.get(type);
        if (!pool || pool.length === 0) {
            this.expandPool(type, Math.ceil(this.config.objectPool.initialSize * this.config.objectPool.growthFactor));
        }

        const obj = pool?.pop() || this.createPoolObject(type);
        this.updatePoolUtilization();
        return obj as T;
    }

    /**
     * オブジェクトをプールに返却
     * 要件8.3: メモリ使用量の適切な管理
     */
    returnToPool(type: string, obj: any): void {
        const pool = this.objectPools.get(type);
        if (!pool || pool.length >= this.config.objectPool.maxSize) {
            return; // プールが満杯の場合は破棄
        }

        // オブジェクトをリセット
        this.resetPoolObject(type, obj);
        pool.push(obj);
        this.updatePoolUtilization();
    }

    /**
     * プールオブジェクトをリセット
     */
    private resetPoolObject(type: string, obj: any): void {
        switch (type) {
            case 'StatModifiers':
                Object.keys(obj).forEach(key => obj[key] = 0);
                break;
            case 'UIUpdateBatch':
                obj.characterIds.clear();
                obj.updateTypes.clear();
                obj.priority = 0;
                obj.scheduledTime = 0;
                break;
            default:
                // 基本的なリセット
                Object.keys(obj).forEach(key => {
                    if (typeof obj[key] === 'number') obj[key] = 0;
                    else if (typeof obj[key] === 'string') obj[key] = '';
                    else if (typeof obj[key] === 'boolean') obj[key] = false;
                    else if (Array.isArray(obj[key])) obj[key].length = 0;
                    else if (obj[key] instanceof Set) obj[key].clear();
                    else if (obj[key] instanceof Map) obj[key].clear();
                });
        }
    }

    /**
     * 能力値修正をキャッシュから取得または計算
     * 要件8.1: 職業データの読み込み時間2秒以内
     * 要件8.4: CPUリソースの使用最適化
     */
    getCachedStatModifiers(characterId: string, job: Job, rank: number): StatModifiers {
        if (!job || !job.id) {
            return {
                hp: 0, mp: 0, attack: 0, defense: 0, speed: 0, skill: 0, luck: 0
            };
        }

        const cacheKey = `${characterId}-${job.id}-${rank}`;
        const cached = this.getCacheEntry(this.cache.statModifiers, cacheKey);

        if (cached) {
            return cached;
        }

        // 計算時間を測定
        const startTime = performance.now();
        const modifiers = job.getStatModifiers();
        const endTime = performance.now();

        this.updateCalculationTime(endTime - startTime);
        this.setCacheEntry(this.cache.statModifiers, cacheKey, modifiers);

        return modifiers;
    }

    /**
     * スキルリストをキャッシュから取得または計算
     * 要件8.1: 職業データの読み込み時間2秒以内
     */
    getCachedSkillList(characterId: string, job: Job, rank: number): string[] {
        if (!job || !job.id) {
            return [];
        }

        const cacheKey = `${characterId}-${job.id}-${rank}`;
        const cached = this.getCacheEntry(this.cache.skillLists, cacheKey);

        if (cached) {
            return cached;
        }

        const skills = job.getAvailableSkills();
        this.setCacheEntry(this.cache.skillLists, cacheKey, skills);

        return skills;
    }

    /**
     * キャッシュエントリを取得
     */
    private getCacheEntry<T>(cache: Map<string, CacheEntry<T>>, key: string): T | null {
        const entry = cache.get(key);
        if (!entry) {
            return null;
        }

        // TTLチェック
        if (Date.now() - entry.timestamp > this.config.cache.ttlMs) {
            cache.delete(key);
            return null;
        }

        // アクセス情報を更新
        entry.accessCount++;
        entry.lastAccessed = Date.now();

        this.updateCacheHitRate(true);
        return entry.data;
    }

    /**
     * キャッシュエントリを設定
     */
    private setCacheEntry<T>(cache: Map<string, CacheEntry<T>>, key: string, data: T): void {
        // キャッシュサイズ制限チェック
        if (cache.size >= this.config.cache.maxCacheSize) {
            this.evictLRUEntries(cache);
        }

        cache.set(key, {
            data,
            timestamp: Date.now(),
            accessCount: 1,
            lastAccessed: Date.now()
        });

        this.updateCacheHitRate(false);
    }

    /**
     * LRUエントリを削除
     */
    private evictLRUEntries<T>(cache: Map<string, CacheEntry<T>>): void {
        if (!this.config.cache.enableLRU) {
            return;
        }

        const entries = Array.from(cache.entries());
        entries.sort((a, b) => a[1].lastAccessed - b[1].lastAccessed);

        // 古いエントリの25%を削除
        const removeCount = Math.ceil(entries.length * 0.25);
        for (let i = 0; i < removeCount; i++) {
            cache.delete(entries[i][0]);
        }
    }

    /**
     * UI更新をバッチ処理でスケジュール
     * 要件8.2: 職業変更の処理時間1秒以内
     */
    scheduleUIUpdate(characterId: string, updateType: string, priority: number = 0): void {
        const batch = this.getFromPool<UIUpdateBatch>('UIUpdateBatch');
        batch.characterIds.add(characterId);
        batch.updateTypes.add(updateType);
        batch.priority = priority;
        batch.scheduledTime = Date.now() + 16; // 次のフレーム

        this.uiUpdateQueue.push(batch);
        this.uiUpdateQueue.sort((a, b) => b.priority - a.priority);
    }

    /**
     * バッチ処理されたUI更新を実行
     * 要件8.2: 職業変更の処理時間1秒以内
     */
    processBatchedUIUpdates(): void {
        const now = Date.now();
        const readyBatches = this.uiUpdateQueue.filter(batch => batch.scheduledTime <= now);

        if (readyBatches.length === 0) {
            return;
        }

        // 同じキャラクターの更新をマージ
        const mergedUpdates = new Map<string, Set<string>>();

        readyBatches.forEach(batch => {
            batch.characterIds.forEach(characterId => {
                if (!mergedUpdates.has(characterId)) {
                    mergedUpdates.set(characterId, new Set());
                }
                batch.updateTypes.forEach(type => {
                    mergedUpdates.get(characterId)!.add(type);
                });
            });

            // バッチをプールに返却
            this.returnToPool('UIUpdateBatch', batch);
        });

        // 実際のUI更新を実行
        mergedUpdates.forEach((updateTypes, characterId) => {
            this.executeUIUpdate(characterId, Array.from(updateTypes));
        });

        // 処理済みバッチを削除
        this.uiUpdateQueue = this.uiUpdateQueue.filter(batch => batch.scheduledTime > now);
        this.updateUIUpdateFrequency();
    }

    /**
     * 実際のUI更新を実行
     */
    private executeUIUpdate(characterId: string, updateTypes: string[]): void {
        // UI更新の実装（実際のUI要素の更新）
        updateTypes.forEach(type => {
            switch (type) {
                case 'stats':
                    this.updateCharacterStatsUI(characterId);
                    break;
                case 'skills':
                    this.updateCharacterSkillsUI(characterId);
                    break;
                case 'job':
                    this.updateCharacterJobUI(characterId);
                    break;
                case 'rank':
                    this.updateCharacterRankUI(characterId);
                    break;
            }
        });
    }

    /**
     * キャラクター能力値UIを更新
     */
    private updateCharacterStatsUI(characterId: string): void {
        // 実際のUI更新処理
        console.log(`Updating stats UI for character ${characterId}`);
    }

    /**
     * キャラクタースキルUIを更新
     */
    private updateCharacterSkillsUI(characterId: string): void {
        // 実際のUI更新処理
        console.log(`Updating skills UI for character ${characterId}`);
    }

    /**
     * キャラクター職業UIを更新
     */
    private updateCharacterJobUI(characterId: string): void {
        // 実際のUI更新処理
        console.log(`Updating job UI for character ${characterId}`);
    }

    /**
     * キャラクターランクUIを更新
     */
    private updateCharacterRankUI(characterId: string): void {
        // 実際のUI更新処理
        console.log(`Updating rank UI for character ${characterId}`);
    }

    /**
     * メモリ監視を開始
     * 要件8.3: メモリ使用量の適切な管理
     */
    private startMemoryWatcher(): void {
        this.memoryWatcher = setInterval(() => {
            this.updateMemoryMetrics();
            this.performMemoryCleanup();
        }, 30000); // 30秒間隔
    }

    /**
     * メモリメトリクスを更新
     */
    private updateMemoryMetrics(): void {
        if (typeof performance !== 'undefined' && performance.memory) {
            this.metrics.memoryUsage = performance.memory.usedJSHeapSize;
        }
    }

    /**
     * メモリクリーンアップを実行
     * 要件8.3: メモリ使用量の適切な管理
     */
    private performMemoryCleanup(): void {
        // 期限切れキャッシュエントリを削除
        this.cleanupExpiredCache();

        // オブジェクトプールを最適化
        this.optimizeObjectPools();

        // UI更新キューをクリーンアップ
        this.cleanupUIUpdateQueue();
    }

    /**
     * 期限切れキャッシュを削除
     */
    private cleanupExpiredCache(): void {
        const now = Date.now();
        const caches = [
            this.cache.statModifiers,
            this.cache.skillLists,
            this.cache.rankUpRequirements,
            this.cache.jobCompatibility
        ];

        caches.forEach(cache => {
            const expiredKeys: string[] = [];
            cache.forEach((entry, key) => {
                if (now - entry.timestamp > this.config.cache.ttlMs) {
                    expiredKeys.push(key);
                }
            });
            expiredKeys.forEach(key => cache.delete(key));
        });
    }

    /**
     * オブジェクトプールを最適化
     */
    private optimizeObjectPools(): void {
        this.objectPools.forEach((pool, type) => {
            const utilizationRate = this.calculatePoolUtilization(type);

            // 使用率が低い場合はプールサイズを縮小
            if (utilizationRate < this.config.objectPool.shrinkThreshold) {
                const targetSize = Math.max(
                    this.config.objectPool.initialSize,
                    Math.ceil(pool.length * 0.7)
                );
                pool.splice(targetSize);
            }
        });
    }

    /**
     * プール使用率を計算
     */
    private calculatePoolUtilization(type: string): number {
        const pool = this.objectPools.get(type);
        if (!pool) return 0;

        const maxSize = this.config.objectPool.maxSize;
        const currentSize = pool.length;
        return (maxSize - currentSize) / maxSize;
    }

    /**
     * UI更新キューをクリーンアップ
     */
    private cleanupUIUpdateQueue(): void {
        const now = Date.now();
        const expiredBatches = this.uiUpdateQueue.filter(
            batch => now - batch.scheduledTime > 5000 // 5秒以上古い
        );

        expiredBatches.forEach(batch => {
            this.returnToPool('UIUpdateBatch', batch);
        });

        this.uiUpdateQueue = this.uiUpdateQueue.filter(
            batch => now - batch.scheduledTime <= 5000
        );
    }

    /**
     * パフォーマンスメトリクスを更新
     */
    private updateCacheHitRate(hit: boolean): void {
        // 簡単な移動平均でヒット率を計算
        const alpha = 0.1;
        const hitValue = hit ? 1 : 0;
        this.metrics.cacheHitRate = this.metrics.cacheHitRate * (1 - alpha) + hitValue * alpha;
    }

    /**
     * 計算時間メトリクスを更新
     */
    private updateCalculationTime(time: number): void {
        const alpha = 0.1;
        this.metrics.averageCalculationTime =
            this.metrics.averageCalculationTime * (1 - alpha) + time * alpha;
    }

    /**
     * プール使用率メトリクスを更新
     */
    private updatePoolUtilization(): void {
        let totalUtilization = 0;
        let poolCount = 0;

        this.objectPools.forEach((pool, type) => {
            totalUtilization += this.calculatePoolUtilization(type);
            poolCount++;
        });

        this.metrics.objectPoolUtilization = poolCount > 0 ? totalUtilization / poolCount : 0;
    }

    /**
     * UI更新頻度メトリクスを更新
     */
    private updateUIUpdateFrequency(): void {
        const now = Date.now();
        const timeSinceLastUpdate = now - this.metrics.lastOptimizationTime;

        if (timeSinceLastUpdate > 0) {
            this.metrics.uiUpdateFrequency = 1000 / timeSinceLastUpdate; // updates per second
        }

        this.metrics.lastOptimizationTime = now;
    }

    /**
     * パフォーマンスメトリクスを取得
     * 要件8.4: CPUリソースの使用最適化
     */
    getPerformanceMetrics(): PerformanceMetrics {
        return { ...this.metrics };
    }

    /**
     * キャッシュを事前ロード
     * 要件8.1: 職業データの読み込み時間2秒以内
     */
    preloadCommonData(jobs: Job[], characters: Unit[]): void {
        if (!this.config.cache.preloadCommonData) {
            return;
        }

        const startTime = performance.now();

        // よく使用される職業データを事前計算
        jobs.forEach(job => {
            for (let rank = 1; rank <= job.maxRank; rank++) {
                const cacheKey = `preload-${job.id}-${rank}`;
                this.setCacheEntry(this.cache.statModifiers, cacheKey, job.getStatModifiers());
                this.setCacheEntry(this.cache.skillLists, cacheKey, job.getAvailableSkills());
            }
        });

        const endTime = performance.now();
        console.log(`Preloaded common data in ${endTime - startTime}ms`);
    }

    /**
     * システムを破棄
     * 要件8.5: エラー時のゲーム全体への影響防止
     */
    dispose(): void {
        // メモリ監視を停止
        if (this.memoryWatcher) {
            clearInterval(this.memoryWatcher);
            this.memoryWatcher = null;
        }

        // キャッシュをクリア
        Object.values(this.cache).forEach(cache => cache.clear());

        // オブジェクトプールをクリア
        this.objectPools.clear();

        // UI更新キューをクリア
        this.uiUpdateQueue.length = 0;

        // パフォーマンスタイマーをクリア
        this.performanceTimer.clear();

        console.log('JobPerformanceManager disposed');
    }
}