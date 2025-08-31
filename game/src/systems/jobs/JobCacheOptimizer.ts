/**
 * JobCacheOptimizer - 職業データのキャッシュ最適化システム
 * 
 * このクラスは職業データのキャッシュ最適化、プリロード、
 * インテリジェントなキャッシュ戦略を提供します。
 * 要件8.1, 8.4に対応した機能を提供します。
 */

import {
    JobData,
    StatModifiers,
    CharacterJobData,
    RankUpRequirements,
    JobCategory
} from '../../types/job';
import { Job } from './Job';
import { Unit } from '../../types/gameplay';

/**
 * キャッシュ戦略の種類
 */
export enum CacheStrategy {
    LRU = 'lru',           // Least Recently Used
    LFU = 'lfu',           // Least Frequently Used
    FIFO = 'fifo',         // First In First Out
    ADAPTIVE = 'adaptive'   // 適応的戦略
}

/**
 * キャッシュ統計情報
 */
export interface CacheStats {
    hitCount: number;
    missCount: number;
    hitRate: number;
    totalRequests: number;
    cacheSize: number;
    maxCacheSize: number;
    evictionCount: number;
    averageAccessTime: number;
}

/**
 * キャッシュエントリの詳細情報
 */
interface CacheEntryDetail<T> {
    data: T;
    key: string;
    createdAt: number;
    lastAccessed: number;
    accessCount: number;
    computationTime: number;
    size: number;
    priority: number;
    tags: Set<string>;
}

/**
 * プリロード設定
 */
export interface PreloadConfig {
    enabled: boolean;
    commonJobs: string[];
    popularRanks: number[];
    maxPreloadItems: number;
    preloadOnIdle: boolean;
    preloadThreshold: number;
}

/**
 * キャッシュ最適化設定
 */
export interface CacheOptimizerConfig {
    strategy: CacheStrategy;
    maxSize: number;
    ttlMs: number;
    enableCompression: boolean;
    enablePredictive: boolean;
    preload: PreloadConfig;
    adaptiveThresholds: {
        hitRateThreshold: number;
        accessFrequencyThreshold: number;
        memoryPressureThreshold: number;
    };
}

/**
 * アクセスパターン分析
 */
interface AccessPattern {
    jobId: string;
    rank: number;
    frequency: number;
    lastAccess: number;
    predictedNextAccess: number;
    accessTimes: number[];
}

/**
 * 職業データキャッシュ最適化クラス
 */
export class JobCacheOptimizer {
    private config: CacheOptimizerConfig;
    private caches: Map<string, Map<string, CacheEntryDetail<any>>> = new Map();
    private stats: Map<string, CacheStats> = new Map();
    private accessPatterns: Map<string, AccessPattern> = new Map();
    private preloadQueue: Set<string> = new Set();
    private compressionMap: Map<string, string> = new Map();
    private predictiveTimer: NodeJS.Timeout | null = null;
    private cleanupTimer: NodeJS.Timeout | null = null;

    constructor(config: Partial<CacheOptimizerConfig> = {}) {
        this.config = {
            strategy: CacheStrategy.ADAPTIVE,
            maxSize: 500,
            ttlMs: 600000, // 10分
            enableCompression: true,
            enablePredictive: true,
            preload: {
                enabled: true,
                commonJobs: ['warrior', 'mage', 'archer', 'healer'],
                popularRanks: [1, 2, 3],
                maxPreloadItems: 50,
                preloadOnIdle: true,
                preloadThreshold: 0.1
            },
            adaptiveThresholds: {
                hitRateThreshold: 0.8,
                accessFrequencyThreshold: 10,
                memoryPressureThreshold: 0.9
            },
            ...config
        };

        this.initializeCaches();
        this.startOptimizationTimers();
    }

    /**
     * キャッシュを初期化
     */
    private initializeCaches(): void {
        const cacheTypes = [
            'statModifiers',
            'skillLists',
            'rankUpRequirements',
            'jobCompatibility',
            'growthRates',
            'jobTraits'
        ];

        cacheTypes.forEach(type => {
            this.caches.set(type, new Map());
            this.stats.set(type, {
                hitCount: 0,
                missCount: 0,
                hitRate: 0,
                totalRequests: 0,
                cacheSize: 0,
                maxCacheSize: this.config.maxSize,
                evictionCount: 0,
                averageAccessTime: 0
            });
        });
    }

    /**
     * 最適化タイマーを開始
     */
    private startOptimizationTimers(): void {
        // 予測的プリロード
        if (this.config.enablePredictive) {
            this.predictiveTimer = setInterval(() => {
                this.performPredictivePreload();
            }, 30000); // 30秒間隔
        }

        // 定期クリーンアップ
        this.cleanupTimer = setInterval(() => {
            this.performCacheCleanup();
            this.optimizeCacheStrategy();
        }, 60000); // 1分間隔
    }

    /**
     * キャッシュからデータを取得
     * 要件8.1: 職業データの読み込み時間2秒以内
     */
    get<T>(cacheType: string, key: string, computeFunction?: () => T): T | null {
        const startTime = performance.now();
        const cache = this.caches.get(cacheType);
        const stats = this.stats.get(cacheType);

        if (!cache || !stats) {
            return null;
        }

        stats.totalRequests++;

        // キャッシュヒット確認
        const entry = cache.get(key);
        if (entry && this.isEntryValid(entry)) {
            // ヒット
            entry.lastAccessed = Date.now();
            entry.accessCount++;
            stats.hitCount++;

            this.updateAccessPattern(key, Date.now());
            this.updateStats(cacheType, performance.now() - startTime);

            return this.decompressData(entry.data);
        }

        // キャッシュミス
        stats.missCount++;

        if (computeFunction) {
            const computeStartTime = performance.now();
            const data = computeFunction();
            const computeTime = performance.now() - computeStartTime;

            // 新しいエントリをキャッシュに追加
            this.set(cacheType, key, data, computeTime);

            this.updateAccessPattern(key, Date.now());
            this.updateStats(cacheType, performance.now() - startTime);

            return data;
        }

        this.updateStats(cacheType, performance.now() - startTime);
        return null;
    }

    /**
     * キャッシュにデータを設定
     * 要件8.4: CPUリソースの使用最適化
     */
    set<T>(cacheType: string, key: string, data: T, computationTime: number = 0): void {
        const cache = this.caches.get(cacheType);
        const stats = this.stats.get(cacheType);

        if (!cache || !stats) {
            return;
        }

        // キャッシュサイズ制限チェック
        if (cache.size >= this.config.maxSize) {
            this.evictEntries(cacheType);
        }

        const compressedData = this.compressData(data);
        const entry: CacheEntryDetail<T> = {
            data: compressedData,
            key,
            createdAt: Date.now(),
            lastAccessed: Date.now(),
            accessCount: 1,
            computationTime,
            size: this.estimateSize(data),
            priority: this.calculatePriority(key, computationTime),
            tags: this.generateTags(key)
        };

        cache.set(key, entry);
        stats.cacheSize = cache.size;
    }

    /**
     * エントリが有効かチェック
     */
    private isEntryValid(entry: CacheEntryDetail<any>): boolean {
        const now = Date.now();
        return (now - entry.createdAt) < this.config.ttlMs;
    }

    /**
     * データを圧縮
     */
    private compressData<T>(data: T): T {
        if (!this.config.enableCompression) {
            return data;
        }

        // 簡単な圧縮（実際の実装では適切な圧縮ライブラリを使用）
        if (typeof data === 'object' && data !== null) {
            try {
                const jsonString = JSON.stringify(data);
                if (jsonString.length > 1000) {
                    // 大きなオブジェクトの場合は圧縮を試行
                    const compressed = this.simpleCompress(jsonString);
                    this.compressionMap.set(JSON.stringify(data), compressed);
                    return data; // 実際の圧縮実装では圧縮されたデータを返す
                }
            } catch (error) {
                console.warn('Compression failed:', error);
            }
        }

        return data;
    }

    /**
     * データを展開
     */
    private decompressData<T>(data: T): T {
        if (!this.config.enableCompression) {
            return data;
        }

        // 圧縮されたデータの展開
        const compressed = this.compressionMap.get(JSON.stringify(data));
        if (compressed) {
            try {
                const decompressed = this.simpleDecompress(compressed);
                return JSON.parse(decompressed);
            } catch (error) {
                console.warn('Decompression failed:', error);
            }
        }

        return data;
    }

    /**
     * 簡単な圧縮（実装例）
     */
    private simpleCompress(data: string): string {
        // 実際の実装では適切な圧縮アルゴリズムを使用
        return data.replace(/\s+/g, ' ').trim();
    }

    /**
     * 簡単な展開（実装例）
     */
    private simpleDecompress(data: string): string {
        // 実際の実装では適切な展開アルゴリズムを使用
        return data;
    }

    /**
     * データサイズを推定
     */
    private estimateSize(data: any): number {
        try {
            return JSON.stringify(data).length * 2; // 概算
        } catch {
            return 100; // デフォルト値
        }
    }

    /**
     * エントリの優先度を計算
     */
    private calculatePriority(key: string, computationTime: number): number {
        const pattern = this.accessPatterns.get(key);
        const frequency = pattern ? pattern.frequency : 1;
        const recency = pattern ? (Date.now() - pattern.lastAccess) : 0;

        // 計算時間、アクセス頻度、最近性を考慮した優先度
        return (computationTime * 0.4) + (frequency * 0.4) + (1 / (recency + 1) * 0.2);
    }

    /**
     * タグを生成
     */
    private generateTags(key: string): Set<string> {
        const tags = new Set<string>();

        // キーから情報を抽出してタグ化
        if (key.includes('warrior')) tags.add('warrior');
        if (key.includes('mage')) tags.add('mage');
        if (key.includes('archer')) tags.add('archer');
        if (key.includes('healer')) tags.add('healer');
        if (key.includes('thief')) tags.add('thief');

        const rankMatch = key.match(/rank-(\d+)/);
        if (rankMatch) {
            tags.add(`rank-${rankMatch[1]}`);
        }

        return tags;
    }

    /**
     * エントリを削除（戦略に基づく）
     * 要件8.4: CPUリソースの使用最適化
     */
    private evictEntries(cacheType: string): void {
        const cache = this.caches.get(cacheType);
        const stats = this.stats.get(cacheType);

        if (!cache || !stats) {
            return;
        }

        const entries = Array.from(cache.entries());
        const evictCount = Math.ceil(cache.size * 0.2); // 20%を削除

        let toEvict: string[] = [];

        switch (this.config.strategy) {
            case CacheStrategy.LRU:
                toEvict = this.selectLRUEntries(entries, evictCount);
                break;
            case CacheStrategy.LFU:
                toEvict = this.selectLFUEntries(entries, evictCount);
                break;
            case CacheStrategy.FIFO:
                toEvict = this.selectFIFOEntries(entries, evictCount);
                break;
            case CacheStrategy.ADAPTIVE:
                toEvict = this.selectAdaptiveEntries(entries, evictCount);
                break;
        }

        toEvict.forEach(key => {
            cache.delete(key);
            stats.evictionCount++;
        });

        stats.cacheSize = cache.size;
    }

    /**
     * LRU戦略でエントリを選択
     */
    private selectLRUEntries(entries: [string, CacheEntryDetail<any>][], count: number): string[] {
        return entries
            .sort((a, b) => a[1].lastAccessed - b[1].lastAccessed)
            .slice(0, count)
            .map(entry => entry[0]);
    }

    /**
     * LFU戦略でエントリを選択
     */
    private selectLFUEntries(entries: [string, CacheEntryDetail<any>][], count: number): string[] {
        return entries
            .sort((a, b) => a[1].accessCount - b[1].accessCount)
            .slice(0, count)
            .map(entry => entry[0]);
    }

    /**
     * FIFO戦略でエントリを選択
     */
    private selectFIFOEntries(entries: [string, CacheEntryDetail<any>][], count: number): string[] {
        return entries
            .sort((a, b) => a[1].createdAt - b[1].createdAt)
            .slice(0, count)
            .map(entry => entry[0]);
    }

    /**
     * 適応的戦略でエントリを選択
     */
    private selectAdaptiveEntries(entries: [string, CacheEntryDetail<any>][], count: number): string[] {
        // 優先度、アクセス頻度、最近性を総合的に評価
        return entries
            .sort((a, b) => {
                const scoreA = this.calculateEvictionScore(a[1]);
                const scoreB = this.calculateEvictionScore(b[1]);
                return scoreA - scoreB;
            })
            .slice(0, count)
            .map(entry => entry[0]);
    }

    /**
     * 削除スコアを計算
     */
    private calculateEvictionScore(entry: CacheEntryDetail<any>): number {
        const now = Date.now();
        const age = now - entry.createdAt;
        const timeSinceAccess = now - entry.lastAccessed;

        // 低いスコアほど削除候補
        return (entry.priority * 0.3) +
            (entry.accessCount * 0.3) +
            (1 / (timeSinceAccess + 1) * 0.2) +
            (1 / (age + 1) * 0.2);
    }

    /**
     * アクセスパターンを更新
     */
    private updateAccessPattern(key: string, accessTime: number): void {
        const pattern = this.accessPatterns.get(key) || {
            jobId: key.split('-')[0] || '',
            rank: parseInt(key.match(/rank-(\d+)/)?.[1] || '1'),
            frequency: 0,
            lastAccess: 0,
            predictedNextAccess: 0,
            accessTimes: []
        };

        pattern.frequency++;
        pattern.lastAccess = accessTime;
        pattern.accessTimes.push(accessTime);

        // 最大100回のアクセス履歴を保持
        if (pattern.accessTimes.length > 100) {
            pattern.accessTimes.shift();
        }

        // 次回アクセス時間を予測
        if (pattern.accessTimes.length >= 3) {
            const intervals = [];
            for (let i = 1; i < pattern.accessTimes.length; i++) {
                intervals.push(pattern.accessTimes[i] - pattern.accessTimes[i - 1]);
            }
            const avgInterval = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
            pattern.predictedNextAccess = accessTime + avgInterval;
        }

        this.accessPatterns.set(key, pattern);
    }

    /**
     * 統計を更新
     */
    private updateStats(cacheType: string, accessTime: number): void {
        const stats = this.stats.get(cacheType);
        if (!stats) return;

        stats.hitRate = stats.totalRequests > 0 ? stats.hitCount / stats.totalRequests : 0;

        // 移動平均でアクセス時間を更新
        const alpha = 0.1;
        stats.averageAccessTime = stats.averageAccessTime * (1 - alpha) + accessTime * alpha;
    }

    /**
     * 予測的プリロードを実行
     * 要件8.1: 職業データの読み込み時間2秒以内
     */
    private performPredictivePreload(): void {
        if (!this.config.preload.enabled) {
            return;
        }

        const now = Date.now();
        const candidates: string[] = [];

        // アクセスパターンから予測
        this.accessPatterns.forEach((pattern, key) => {
            if (pattern.predictedNextAccess > 0 &&
                Math.abs(pattern.predictedNextAccess - now) < 60000) { // 1分以内
                candidates.push(key);
            }
        });

        // 人気の高いデータを予測
        const popularPatterns = Array.from(this.accessPatterns.entries())
            .filter(([_, pattern]) => pattern.frequency >= this.config.adaptiveThresholds.accessFrequencyThreshold)
            .sort((a, b) => b[1].frequency - a[1].frequency)
            .slice(0, 10);

        popularPatterns.forEach(([key, _]) => {
            if (!candidates.includes(key)) {
                candidates.push(key);
            }
        });

        // プリロード実行
        candidates.slice(0, this.config.preload.maxPreloadItems).forEach(key => {
            this.preloadQueue.add(key);
        });

        this.processPreloadQueue();
    }

    /**
     * プリロードキューを処理
     */
    private processPreloadQueue(): void {
        const batchSize = 5;
        const batch = Array.from(this.preloadQueue).slice(0, batchSize);

        batch.forEach(key => {
            this.preloadQueue.delete(key);
            // 実際のプリロード処理（非同期）
            this.performPreload(key);
        });
    }

    /**
     * 個別のプリロードを実行
     */
    private async performPreload(key: string): Promise<void> {
        // キーから情報を解析してデータを事前計算
        const parts = key.split('-');
        if (parts.length >= 2) {
            const jobId = parts[0];
            const rank = parseInt(parts[1]) || 1;

            // 実際のプリロード処理はJobSystemと連携して実行
            console.log(`Preloading data for ${jobId} rank ${rank}`);
        }
    }

    /**
     * キャッシュクリーンアップを実行
     */
    private performCacheCleanup(): void {
        const now = Date.now();

        this.caches.forEach((cache, cacheType) => {
            const expiredKeys: string[] = [];

            cache.forEach((entry, key) => {
                if (!this.isEntryValid(entry)) {
                    expiredKeys.push(key);
                }
            });

            expiredKeys.forEach(key => cache.delete(key));

            const stats = this.stats.get(cacheType);
            if (stats) {
                stats.cacheSize = cache.size;
            }
        });

        // 古いアクセスパターンを削除
        this.accessPatterns.forEach((pattern, key) => {
            if (now - pattern.lastAccess > 3600000) { // 1時間以上未使用
                this.accessPatterns.delete(key);
            }
        });
    }

    /**
     * キャッシュ戦略を最適化
     */
    private optimizeCacheStrategy(): void {
        if (this.config.strategy !== CacheStrategy.ADAPTIVE) {
            return;
        }

        // 各キャッシュのパフォーマンスを分析
        this.stats.forEach((stats, cacheType) => {
            if (stats.hitRate < this.config.adaptiveThresholds.hitRateThreshold) {
                // ヒット率が低い場合は戦略を調整
                console.log(`Low hit rate detected for ${cacheType}: ${(stats.hitRate * 100).toFixed(1)}%`);
                this.adjustCacheStrategy(cacheType);
            }
        });
    }

    /**
     * キャッシュ戦略を調整
     */
    private adjustCacheStrategy(cacheType: string): void {
        // 実際の実装では、パフォーマンス分析に基づいて戦略を動的に調整
        console.log(`Adjusting cache strategy for ${cacheType}`);
    }

    /**
     * 共通データをプリロード
     * 要件8.1: 職業データの読み込み時間2秒以内
     */
    preloadCommonData(jobs: Job[]): void {
        if (!this.config.preload.enabled) {
            return;
        }

        const commonJobs = jobs.filter(job =>
            this.config.preload.commonJobs.includes(job.id)
        );

        commonJobs.forEach(job => {
            this.config.preload.popularRanks.forEach(rank => {
                const key = `${job.id}-rank-${rank}`;
                this.preloadQueue.add(key);
            });
        });

        this.processPreloadQueue();
    }

    /**
     * キャッシュ統計を取得
     */
    getCacheStats(): Map<string, CacheStats> {
        return new Map(this.stats);
    }

    /**
     * 詳細なキャッシュレポートを生成
     */
    generateCacheReport(): string {
        let report = '=== Job Cache Optimizer Report ===\n';

        this.stats.forEach((stats, cacheType) => {
            report += `\n${cacheType.toUpperCase()} Cache:\n`;
            report += `  Hit Rate: ${(stats.hitRate * 100).toFixed(1)}%\n`;
            report += `  Total Requests: ${stats.totalRequests}\n`;
            report += `  Cache Size: ${stats.cacheSize}/${stats.maxCacheSize}\n`;
            report += `  Evictions: ${stats.evictionCount}\n`;
            report += `  Avg Access Time: ${stats.averageAccessTime.toFixed(2)}ms\n`;
        });

        report += `\nAccess Patterns: ${this.accessPatterns.size} tracked\n`;
        report += `Preload Queue: ${this.preloadQueue.size} items\n`;
        report += `Strategy: ${this.config.strategy}\n`;

        return report;
    }

    /**
     * キャッシュをクリア
     */
    clearCache(cacheType?: string): void {
        if (cacheType) {
            const cache = this.caches.get(cacheType);
            if (cache) {
                cache.clear();
                const stats = this.stats.get(cacheType);
                if (stats) {
                    stats.cacheSize = 0;
                }
            }
        } else {
            this.caches.forEach(cache => cache.clear());
            this.stats.forEach(stats => {
                stats.cacheSize = 0;
            });
        }
    }

    /**
     * システムを破棄
     */
    dispose(): void {
        if (this.predictiveTimer) {
            clearInterval(this.predictiveTimer);
            this.predictiveTimer = null;
        }

        if (this.cleanupTimer) {
            clearInterval(this.cleanupTimer);
            this.cleanupTimer = null;
        }

        this.caches.clear();
        this.stats.clear();
        this.accessPatterns.clear();
        this.preloadQueue.clear();
        this.compressionMap.clear();

        console.log('JobCacheOptimizer disposed');
    }
}