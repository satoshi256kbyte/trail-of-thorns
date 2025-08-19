/**
 * ExperienceCache - 経験値テーブルデータキャッシュシステム
 * 
 * このクラスは経験値テーブルデータの効率的なキャッシュ管理を担当します:
 * - 経験値テーブルデータのメモリキャッシュ
 * - 頻繁にアクセスされるデータの高速化
 * - キャッシュサイズの最適化
 * - LRU（Least Recently Used）キャッシュ戦略
 * - キャッシュヒット率の監視
 * 
 * 要件: 8.1, 8.4
 * 
 * @version 1.0.0
 * @author Trail of Thorns Development Team
 */

import { ExperienceTableSchema } from '../../schemas/experienceTableSchema';
import { GrowthRates } from '../../types/experience';

/**
 * キャッシュエントリ
 */
interface CacheEntry<T> {
    key: string;
    value: T;
    accessCount: number;
    lastAccessed: number;
    size: number;
}

/**
 * キャッシュ統計
 */
export interface CacheStatistics {
    totalRequests: number;
    cacheHits: number;
    cacheMisses: number;
    hitRate: number;
    totalSize: number;
    entryCount: number;
    averageAccessTime: number;
    lastOptimized: number;
}

/**
 * キャッシュ設定
 */
export interface CacheConfig {
    maxSize: number;
    maxEntries: number;
    ttl: number; // Time to live in milliseconds
    cleanupInterval: number;
    enableStatistics: boolean;
    enableLRU: boolean;
    preloadCommonData: boolean;
}

/**
 * ExperienceCacheクラス
 * 経験値システムのデータキャッシュを管理
 */
export class ExperienceCache {
    private static instance: ExperienceCache;

    private config: CacheConfig;
    private cache: Map<string, CacheEntry<any>> = new Map();
    private statistics: CacheStatistics;

    // キャッシュクリーンアップ用タイマー
    private cleanupTimer: NodeJS.Timeout | null = null;

    // プリロードされたデータ
    private experienceTable: ExperienceTableSchema | null = null;
    private growthRatesCache: Map<string, GrowthRates> = new Map();
    private levelRequirementsCache: Map<number, number> = new Map();
    private experienceGainsCache: Map<string, number> = new Map();

    private constructor() {
        this.config = this.getDefaultConfig();
        this.statistics = this.getInitialStatistics();
        this.initializeCache();
    }

    /**
     * シングルトンインスタンスを取得
     */
    public static getInstance(): ExperienceCache {
        if (!ExperienceCache.instance) {
            ExperienceCache.instance = new ExperienceCache();
        }
        return ExperienceCache.instance;
    }

    /**
     * 経験値テーブルをキャッシュに設定
     */
    public setExperienceTable(table: ExperienceTableSchema): void {
        this.experienceTable = table;

        if (this.config.preloadCommonData) {
            this.preloadCommonData();
        }

        console.log('Experience table cached successfully');
    }

    /**
     * レベル別必要経験値を取得（キャッシュ付き）
     */
    public getRequiredExperience(level: number): number {
        const cacheKey = `level_req_${level}`;

        // キャッシュから取得を試行
        const cached = this.get<number>(cacheKey);
        if (cached !== null) {
            return cached;
        }

        // キャッシュミス：計算して保存
        if (!this.experienceTable) {
            throw new Error('Experience table not loaded');
        }

        let requiredExp = 0;
        if (level >= 0 && level < this.experienceTable.levelRequirements.length) {
            requiredExp = this.experienceTable.levelRequirements[level];
        } else if (level >= this.experienceTable.levelRequirements.length) {
            requiredExp = this.experienceTable.levelRequirements[this.experienceTable.levelRequirements.length - 1];
        }

        // キャッシュに保存
        this.set(cacheKey, requiredExp, this.calculateDataSize(requiredExp));

        return requiredExp;
    }

    /**
     * 経験値獲得量を取得（キャッシュ付き）
     */
    public getExperienceGain(source: string, difficulty: string = 'normal'): number {
        const cacheKey = `exp_gain_${source}_${difficulty}`;

        // キャッシュから取得を試行
        const cached = this.get<number>(cacheKey);
        if (cached !== null) {
            return cached;
        }

        // キャッシュミス：計算して保存
        if (!this.experienceTable) {
            throw new Error('Experience table not loaded');
        }

        let baseExp = 0;
        const gains = this.experienceTable.experienceGains;

        switch (source) {
            case 'attackHit':
                baseExp = gains.attackHit;
                break;
            case 'enemyDefeat':
                baseExp = gains.enemyDefeat;
                break;
            case 'allySupport':
                baseExp = gains.allySupport;
                break;
            case 'healing':
                baseExp = gains.healing;
                break;
            case 'skillUse':
                baseExp = gains.skillUse || 3;
                break;
            case 'criticalHit':
                baseExp = gains.criticalHit || 8;
                break;
            case 'counterAttack':
                baseExp = gains.counterAttack || 6;
                break;
            default:
                baseExp = 0;
        }

        // 難易度倍率を適用
        const multiplier = this.experienceTable.experienceMultipliers[difficulty as keyof typeof this.experienceTable.experienceMultipliers] || 1.0;
        const finalExp = Math.floor(baseExp * multiplier);

        // キャッシュに保存
        this.set(cacheKey, finalExp, this.calculateDataSize(finalExp));

        return finalExp;
    }

    /**
     * 成長率を取得（キャッシュ付き）
     */
    public getGrowthRates(characterType: string): GrowthRates {
        const cacheKey = `growth_rates_${characterType}`;

        // キャッシュから取得を試行
        const cached = this.get<GrowthRates>(cacheKey);
        if (cached !== null) {
            return cached;
        }

        // キャッシュミス：計算して保存
        if (!this.experienceTable) {
            throw new Error('Experience table not loaded');
        }

        let growthRates: GrowthRates;
        const characterRates = this.experienceTable.characterGrowthRates[characterType];

        if (characterRates) {
            growthRates = { ...characterRates };
        } else {
            growthRates = { ...this.experienceTable.defaultGrowthRates };
        }

        // キャッシュに保存
        this.set(cacheKey, growthRates, this.calculateDataSize(growthRates));

        return growthRates;
    }

    /**
     * 経験値からレベルを計算（キャッシュ付き）
     */
    public calculateLevelFromExperience(experience: number): number {
        const cacheKey = `level_from_exp_${Math.floor(experience / 100) * 100}`; // 100単位でキャッシュ

        // キャッシュから取得を試行
        const cached = this.get<number>(cacheKey);
        if (cached !== null && experience >= cached * 100 && experience < (cached + 1) * 100) {
            return cached;
        }

        // キャッシュミス：計算して保存
        if (!this.experienceTable) {
            throw new Error('Experience table not loaded');
        }

        if (experience < 0) {
            return 0;
        }

        let level = 0;
        for (let i = this.experienceTable.levelRequirements.length - 1; i >= 0; i--) {
            if (experience >= this.experienceTable.levelRequirements[i]) {
                level = i;
                break;
            }
        }

        // キャッシュに保存
        this.set(cacheKey, level, this.calculateDataSize(level));

        return level;
    }

    /**
     * 次のレベルまでの必要経験値を計算（キャッシュ付き）
     */
    public getExperienceToNextLevel(currentExperience: number): number {
        const currentLevel = this.calculateLevelFromExperience(currentExperience);
        const cacheKey = `exp_to_next_${currentLevel}_${Math.floor(currentExperience / 10) * 10}`;

        // キャッシュから取得を試行
        const cached = this.get<number>(cacheKey);
        if (cached !== null) {
            return cached;
        }

        // キャッシュミス：計算して保存
        if (!this.experienceTable) {
            throw new Error('Experience table not loaded');
        }

        if (currentLevel >= this.experienceTable.maxLevel) {
            this.set(cacheKey, 0, this.calculateDataSize(0));
            return 0;
        }

        const nextLevelRequirement = this.experienceTable.levelRequirements[currentLevel + 1];
        const needed = Math.max(0, nextLevelRequirement - currentExperience);

        // キャッシュに保存
        this.set(cacheKey, needed, this.calculateDataSize(needed));

        return needed;
    }

    /**
     * キャッシュから値を取得
     */
    public get<T>(key: string): T | null {
        this.statistics.totalRequests++;

        const entry = this.cache.get(key);
        if (!entry) {
            this.statistics.cacheMisses++;
            return null;
        }

        // TTLチェック
        if (this.config.ttl > 0 && Date.now() - entry.lastAccessed > this.config.ttl) {
            this.cache.delete(key);
            this.statistics.cacheMisses++;
            return null;
        }

        // アクセス情報を更新
        entry.accessCount++;
        entry.lastAccessed = Date.now();

        this.statistics.cacheHits++;
        this.updateHitRate();

        return entry.value as T;
    }

    /**
     * キャッシュに値を設定
     */
    public set<T>(key: string, value: T, size: number = 0): void {
        // キャッシュサイズ制限チェック
        if (this.shouldEvict(size)) {
            this.evictEntries(size);
        }

        const entry: CacheEntry<T> = {
            key,
            value,
            accessCount: 1,
            lastAccessed: Date.now(),
            size
        };

        this.cache.set(key, entry);
        this.statistics.totalSize += size;
        this.statistics.entryCount++;
    }

    /**
     * キャッシュから値を削除
     */
    public delete(key: string): boolean {
        const entry = this.cache.get(key);
        if (entry) {
            this.cache.delete(key);
            this.statistics.totalSize -= entry.size;
            this.statistics.entryCount--;
            return true;
        }
        return false;
    }

    /**
     * キャッシュをクリア
     */
    public clear(): void {
        this.cache.clear();
        this.statistics.totalSize = 0;
        this.statistics.entryCount = 0;
        console.log('Experience cache cleared');
    }

    /**
     * キャッシュサイズを取得
     */
    public getSize(): number {
        return this.statistics.entryCount;
    }

    /**
     * キャッシュ統計を取得
     */
    public getStatistics(): CacheStatistics {
        return { ...this.statistics };
    }

    /**
     * キャッシュを最適化
     */
    public async optimize(): Promise<void> {
        const beforeSize = this.statistics.entryCount;

        // 期限切れエントリを削除
        this.cleanupExpiredEntries();

        // LRU戦略でエントリを削除
        if (this.config.enableLRU) {
            this.evictLRUEntries();
        }

        const afterSize = this.statistics.entryCount;
        const removed = beforeSize - afterSize;

        this.statistics.lastOptimized = Date.now();

        console.log(`Cache optimized: ${removed} entries removed`);
    }

    /**
     * キャッシュ設定を更新
     */
    public updateConfig(newConfig: Partial<CacheConfig>): void {
        this.config = { ...this.config, ...newConfig };

        // クリーンアップタイマーを再設定
        if (this.cleanupTimer) {
            clearInterval(this.cleanupTimer);
        }
        this.initializeCleanupTimer();
    }

    /**
     * リソースを解放
     */
    public dispose(): void {
        if (this.cleanupTimer) {
            clearInterval(this.cleanupTimer);
            this.cleanupTimer = null;
        }

        this.clear();
        this.growthRatesCache.clear();
        this.levelRequirementsCache.clear();
        this.experienceGainsCache.clear();
    }

    // プライベートメソッド

    /**
     * デフォルト設定を取得
     */
    private getDefaultConfig(): CacheConfig {
        return {
            maxSize: 5 * 1024 * 1024, // 5MB
            maxEntries: 1000,
            ttl: 5 * 60 * 1000, // 5分
            cleanupInterval: 60 * 1000, // 1分
            enableStatistics: true,
            enableLRU: true,
            preloadCommonData: true
        };
    }

    /**
     * 初期統計を取得
     */
    private getInitialStatistics(): CacheStatistics {
        return {
            totalRequests: 0,
            cacheHits: 0,
            cacheMisses: 0,
            hitRate: 0,
            totalSize: 0,
            entryCount: 0,
            averageAccessTime: 0,
            lastOptimized: Date.now()
        };
    }

    /**
     * キャッシュを初期化
     */
    private initializeCache(): void {
        this.initializeCleanupTimer();
        console.log('Experience cache initialized');
    }

    /**
     * クリーンアップタイマーを初期化
     */
    private initializeCleanupTimer(): void {
        if (this.config.cleanupInterval > 0) {
            this.cleanupTimer = setInterval(() => {
                this.cleanupExpiredEntries();
            }, this.config.cleanupInterval);
        }
    }

    /**
     * 共通データをプリロード
     */
    private preloadCommonData(): void {
        if (!this.experienceTable) {
            return;
        }

        // よく使用されるレベルの必要経験値をプリロード
        for (let level = 0; level <= Math.min(50, this.experienceTable.maxLevel); level++) {
            this.getRequiredExperience(level);
        }

        // 基本的な経験値獲得量をプリロード
        const sources = ['attackHit', 'enemyDefeat', 'allySupport', 'healing'];
        const difficulties = ['easy', 'normal', 'hard', 'expert'];

        sources.forEach(source => {
            difficulties.forEach(difficulty => {
                this.getExperienceGain(source, difficulty);
            });
        });

        // 利用可能なキャラクタータイプの成長率をプリロード
        Object.keys(this.experienceTable.characterGrowthRates).forEach(characterType => {
            this.getGrowthRates(characterType);
        });

        console.log('Common experience data preloaded');
    }

    /**
     * データサイズを計算
     */
    private calculateDataSize(data: any): number {
        if (typeof data === 'number') {
            return 8; // 64-bit number
        } else if (typeof data === 'string') {
            return data.length * 2; // UTF-16
        } else if (typeof data === 'object' && data !== null) {
            return JSON.stringify(data).length * 2;
        }
        return 0;
    }

    /**
     * エビクションが必要かチェック
     */
    private shouldEvict(newEntrySize: number): boolean {
        return (
            this.statistics.totalSize + newEntrySize > this.config.maxSize ||
            this.statistics.entryCount >= this.config.maxEntries
        );
    }

    /**
     * エントリをエビクション
     */
    private evictEntries(requiredSize: number): void {
        if (this.config.enableLRU) {
            this.evictLRUEntries(requiredSize);
        } else {
            this.evictOldestEntries(requiredSize);
        }
    }

    /**
     * LRU戦略でエントリをエビクション
     */
    private evictLRUEntries(requiredSize: number = 0): void {
        const entries = Array.from(this.cache.entries());

        // アクセス頻度と最終アクセス時間でソート
        entries.sort((a, b) => {
            const entryA = a[1];
            const entryB = b[1];

            // アクセス頻度が低い順、最終アクセス時間が古い順
            const scoreA = entryA.accessCount / (Date.now() - entryA.lastAccessed + 1);
            const scoreB = entryB.accessCount / (Date.now() - entryB.lastAccessed + 1);

            return scoreA - scoreB;
        });

        let freedSize = 0;
        let removedCount = 0;

        for (const [key, entry] of entries) {
            if (requiredSize > 0 && freedSize >= requiredSize) {
                break;
            }

            if (this.statistics.entryCount <= this.config.maxEntries * 0.5) {
                break; // 最低50%は保持
            }

            this.cache.delete(key);
            freedSize += entry.size;
            removedCount++;
            this.statistics.totalSize -= entry.size;
            this.statistics.entryCount--;
        }

        if (removedCount > 0) {
            console.debug(`LRU eviction: ${removedCount} entries removed, ${freedSize} bytes freed`);
        }
    }

    /**
     * 最古のエントリをエビクション
     */
    private evictOldestEntries(requiredSize: number): void {
        const entries = Array.from(this.cache.entries());

        // 最終アクセス時間でソート（古い順）
        entries.sort((a, b) => a[1].lastAccessed - b[1].lastAccessed);

        let freedSize = 0;
        let removedCount = 0;

        for (const [key, entry] of entries) {
            if (freedSize >= requiredSize) {
                break;
            }

            this.cache.delete(key);
            freedSize += entry.size;
            removedCount++;
            this.statistics.totalSize -= entry.size;
            this.statistics.entryCount--;
        }

        if (removedCount > 0) {
            console.debug(`Oldest eviction: ${removedCount} entries removed, ${freedSize} bytes freed`);
        }
    }

    /**
     * 期限切れエントリをクリーンアップ
     */
    private cleanupExpiredEntries(): void {
        if (this.config.ttl <= 0) {
            return;
        }

        const now = Date.now();
        let removedCount = 0;
        let freedSize = 0;

        for (const [key, entry] of this.cache.entries()) {
            if (now - entry.lastAccessed > this.config.ttl) {
                this.cache.delete(key);
                removedCount++;
                freedSize += entry.size;
                this.statistics.totalSize -= entry.size;
                this.statistics.entryCount--;
            }
        }

        if (removedCount > 0) {
            console.debug(`Expired entries cleanup: ${removedCount} entries removed, ${freedSize} bytes freed`);
        }
    }

    /**
     * ヒット率を更新
     */
    private updateHitRate(): void {
        if (this.statistics.totalRequests > 0) {
            this.statistics.hitRate = this.statistics.cacheHits / this.statistics.totalRequests;
        }
    }
}