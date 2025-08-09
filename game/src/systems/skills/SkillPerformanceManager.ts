/**
 * スキルシステムパフォーマンス最適化・メモリ管理システム
 * 
 * このファイルには以下のクラスが含まれます：
 * - SkillPerformanceManager: パフォーマンス最適化の統合管理
 * - SkillDataCache: スキルデータキャッシュシステム
 * - SkillObjectPool: スキルオブジェクトプール
 * - SkillMemoryManager: メモリ管理システム
 * - PerformanceMonitor: パフォーマンス監視システム
 */

import {
    SkillData,
    Position,
    SkillUsabilityResult,
    CharacterSkillData,
    SkillStatistics
} from '../../types/skill';

import { Skill } from './Skill';

/**
 * パフォーマンス設定
 */
export interface PerformanceConfig {
    /** キャッシュサイズ制限 */
    maxCacheSize: number;
    /** オブジェクトプール最大サイズ */
    maxPoolSize: number;
    /** メモリ使用量制限（MB） */
    memoryLimitMB: number;
    /** パフォーマンス監視間隔（ms） */
    monitoringInterval: number;
    /** 自動クリーンアップを有効にするか */
    enableAutoCleanup: boolean;
    /** 詳細ログを有効にするか */
    enableDetailedLogging: boolean;
}

/**
 * メモリ使用量情報
 */
export interface MemoryUsageInfo {
    /** 総メモリ使用量（MB） */
    totalMemoryMB: number;
    /** スキルキャッシュメモリ使用量（MB） */
    skillCacheMemoryMB: number;
    /** オブジェクトプールメモリ使用量（MB） */
    objectPoolMemoryMB: number;
    /** アクティブスキル数 */
    activeSkillCount: number;
    /** キャッシュヒット率 */
    cacheHitRate: number;
    /** プール使用率 */
    poolUsageRate: number;
    /** 最後の測定時刻 */
    lastMeasuredAt: Date;
}

/**
 * パフォーマンスメトリクス
 */
export interface PerformanceMetrics {
    /** 平均スキル実行時間（ms） */
    averageExecutionTime: number;
    /** 最大スキル実行時間（ms） */
    maxExecutionTime: number;
    /** 条件チェック平均時間（ms） */
    averageConditionCheckTime: number;
    /** キャッシュヒット数 */
    cacheHits: number;
    /** キャッシュミス数 */
    cacheMisses: number;
    /** オブジェクト作成数 */
    objectCreations: number;
    /** オブジェクト再利用数 */
    objectReuses: number;
    /** ガベージコレクション実行回数 */
    gcExecutions: number;
    /** フレームレート（FPS） */
    currentFPS: number;
    /** 最後の更新時刻 */
    lastUpdatedAt: Date;
}

/**
 * キャッシュエントリ
 */
interface CacheEntry<T> {
    /** キャッシュされたデータ */
    data: T;
    /** 作成時刻 */
    createdAt: number;
    /** 最後のアクセス時刻 */
    lastAccessedAt: number;
    /** アクセス回数 */
    accessCount: number;
    /** データサイズ（概算） */
    estimatedSize: number;
}

/**
 * スキルデータキャッシュシステム
 * 頻繁にアクセスされるスキルデータをメモリキャッシュする
 */
export class SkillDataCache {
    private cache: Map<string, CacheEntry<any>> = new Map();
    private maxSize: number;
    private totalSize: number = 0;
    private hits: number = 0;
    private misses: number = 0;

    constructor(maxSize: number = 1000) {
        this.maxSize = maxSize;
    }

    /**
     * データを取得する（キャッシュから）
     * @param key キー
     * @returns キャッシュされたデータ
     */
    get<T>(key: string): T | null {
        const entry = this.cache.get(key);
        if (entry) {
            entry.lastAccessedAt = performance.now();
            entry.accessCount++;
            this.hits++;
            return entry.data as T;
        }

        this.misses++;
        return null;
    }

    /**
     * データをキャッシュに保存する
     * @param key キー
     * @param data データ
     * @param estimatedSize データサイズ（概算）
     */
    set<T>(key: string, data: T, estimatedSize: number = 1): void {
        // キャッシュサイズ制限チェック
        if (this.cache.size >= this.maxSize) {
            this.evictLeastRecentlyUsed();
        }

        const now = performance.now();
        const entry: CacheEntry<T> = {
            data,
            createdAt: now,
            lastAccessedAt: now,
            accessCount: 1,
            estimatedSize
        };

        // 既存エントリがある場合はサイズを調整
        const existingEntry = this.cache.get(key);
        if (existingEntry) {
            this.totalSize -= existingEntry.estimatedSize;
        }

        this.cache.set(key, entry);
        this.totalSize += estimatedSize;
    }

    /**
     * キャッシュからデータを削除する
     * @param key キー
     */
    delete(key: string): boolean {
        const entry = this.cache.get(key);
        if (entry) {
            this.totalSize -= entry.estimatedSize;
            return this.cache.delete(key);
        }
        return false;
    }

    /**
     * キャッシュをクリアする
     */
    clear(): void {
        this.cache.clear();
        this.totalSize = 0;
        this.hits = 0;
        this.misses = 0;
    }

    /**
     * 最も使用頻度の低いエントリを削除する（LRU）
     */
    private evictLeastRecentlyUsed(): void {
        let oldestKey: string | null = null;
        let oldestTime = Infinity;

        for (const [key, entry] of this.cache.entries()) {
            if (entry.lastAccessedAt < oldestTime) {
                oldestTime = entry.lastAccessedAt;
                oldestKey = key;
            }
        }

        if (oldestKey) {
            this.delete(oldestKey);
        }
    }

    /**
     * キャッシュヒット率を取得する
     * @returns ヒット率（0-1）
     */
    getHitRate(): number {
        const total = this.hits + this.misses;
        return total > 0 ? this.hits / total : 0;
    }

    /**
     * キャッシュ統計情報を取得する
     * @returns 統計情報
     */
    getStatistics(): {
        size: number;
        totalSize: number;
        hits: number;
        misses: number;
        hitRate: number;
    } {
        return {
            size: this.cache.size,
            totalSize: this.totalSize,
            hits: this.hits,
            misses: this.misses,
            hitRate: this.getHitRate()
        };
    }
}

/**
 * スキルオブジェクトプール
 * スキルオブジェクトの再利用によるメモリ管理
 */
export class SkillObjectPool {
    private pools: Map<string, Skill[]> = new Map();
    private maxPoolSize: number;
    private createdObjects: number = 0;
    private reusedObjects: number = 0;

    constructor(maxPoolSize: number = 100) {
        this.maxPoolSize = maxPoolSize;
    }

    /**
     * スキルオブジェクトを取得する
     * @param skillType スキル種別
     * @param skillData スキルデータ
     * @returns スキルオブジェクト
     */
    acquire(skillType: string, skillData: SkillData): Skill | null {
        const pool = this.pools.get(skillType);

        if (pool && pool.length > 0) {
            const skill = pool.pop()!;
            // スキルデータを更新
            skill.updateData(skillData);
            this.reusedObjects++;
            return skill;
        }

        // プールにオブジェクトがない場合は新規作成を示すnullを返す
        return null;
    }

    /**
     * スキルオブジェクトをプールに返却する
     * @param skill スキルオブジェクト
     */
    release(skill: Skill): void {
        const skillType = skill.skillType;
        let pool = this.pools.get(skillType);

        if (!pool) {
            pool = [];
            this.pools.set(skillType, pool);
        }

        // プールサイズ制限チェック
        if (pool.length < this.maxPoolSize) {
            // スキルオブジェクトをリセット
            skill.reset();
            pool.push(skill);
        }
    }

    /**
     * 新規オブジェクト作成をカウント
     */
    incrementCreatedCount(): void {
        this.createdObjects++;
    }

    /**
     * プール統計情報を取得する
     * @returns 統計情報
     */
    getStatistics(): {
        totalPools: number;
        totalPooledObjects: number;
        createdObjects: number;
        reusedObjects: number;
        reuseRate: number;
    } {
        let totalPooledObjects = 0;
        for (const pool of this.pools.values()) {
            totalPooledObjects += pool.length;
        }

        const totalObjects = this.createdObjects + this.reusedObjects;
        const reuseRate = totalObjects > 0 ? this.reusedObjects / totalObjects : 0;

        return {
            totalPools: this.pools.size,
            totalPooledObjects,
            createdObjects: this.createdObjects,
            reusedObjects: this.reusedObjects,
            reuseRate
        };
    }

    /**
     * プールをクリアする
     */
    clear(): void {
        for (const pool of this.pools.values()) {
            for (const skill of pool) {
                skill.destroy?.();
            }
        }
        this.pools.clear();
        this.createdObjects = 0;
        this.reusedObjects = 0;
    }
}

/**
 * 最適化された条件チェッカー
 * 早期リターンによる条件チェック最適化
 */
export class OptimizedConditionChecker {
    private cache: SkillDataCache;
    private lastCheckResults: Map<string, { result: SkillUsabilityResult; timestamp: number }> = new Map();
    private readonly CACHE_DURATION = 100; // 100ms

    constructor(cache: SkillDataCache) {
        this.cache = cache;
    }

    /**
     * 最適化された条件チェック
     * @param skill スキル
     * @param casterId 使用者ID
     * @param targetPosition 対象位置
     * @param battlefieldState 戦場状態
     * @param characterSkillData キャラクタースキルデータ
     * @returns 使用可能性結果
     */
    canUseSkillOptimized(
        skill: Skill,
        casterId: string,
        targetPosition: Position,
        battlefieldState: any,
        characterSkillData?: CharacterSkillData
    ): SkillUsabilityResult {
        const startTime = performance.now();

        // キャッシュキーを生成
        const cacheKey = this.generateCacheKey(skill.id, casterId, targetPosition);

        // 最近の結果をチェック（短時間での重複チェックを避ける）
        const cachedResult = this.lastCheckResults.get(cacheKey);
        if (cachedResult && (startTime - cachedResult.timestamp) < this.CACHE_DURATION) {
            return cachedResult.result;
        }

        // 早期リターン条件チェック（軽い順に実行）

        // 1. スキル存在チェック（最も軽い）
        if (!skill) {
            const result = this.createFailureResult('スキルが存在しません');
            this.cacheResult(cacheKey, result, startTime);
            return result;
        }

        // 2. キャラクター存在チェック
        const caster = battlefieldState?.getCharacter?.(casterId);
        if (!caster) {
            const result = this.createFailureResult('使用者が見つかりません');
            this.cacheResult(cacheKey, result, startTime);
            return result;
        }

        // 3. 行動済みチェック（軽い）
        if (caster.hasActed) {
            const result = this.createFailureResult('既に行動済みです');
            this.cacheResult(cacheKey, result, startTime);
            return result;
        }

        // 4. MP不足チェック（軽い）
        if (caster.currentMP < skill.usageCondition.mpCost) {
            const result = this.createFailureResult(
                `MP不足です（必要: ${skill.usageCondition.mpCost}, 現在: ${caster.currentMP}）`
            );
            this.cacheResult(cacheKey, result, startTime);
            return result;
        }

        // 5. レベル要件チェック（軽い）
        if (caster.level < skill.usageCondition.levelRequirement) {
            const result = this.createFailureResult(
                `レベル不足です（必要: ${skill.usageCondition.levelRequirement}, 現在: ${caster.level}）`
            );
            this.cacheResult(cacheKey, result, startTime);
            return result;
        }

        // 6. 射程チェック（中程度）
        const distance = Math.abs(caster.position.x - targetPosition.x) +
            Math.abs(caster.position.y - targetPosition.y);
        if (distance > skill.range) {
            const result = this.createFailureResult(
                `射程外です（距離: ${distance}, 射程: ${skill.range}）`
            );
            this.cacheResult(cacheKey, result, startTime);
            return result;
        }

        // 7. クールダウンチェック（中程度）
        if (characterSkillData) {
            const currentTurn = battlefieldState?.getCurrentTurn?.() || 0;
            const lastUsedTurn = characterSkillData.skillCooldowns.get(skill.id) || 0;
            const cooldownPeriod = skill.usageCondition.cooldown;

            if (cooldownPeriod > 0) {
                const remainingCooldown = Math.max(0, cooldownPeriod - (currentTurn - lastUsedTurn));
                if (remainingCooldown > 0) {
                    const result = this.createFailureResult(
                        `クールダウン中です（残り${remainingCooldown}ターン）`
                    );
                    this.cacheResult(cacheKey, result, startTime);
                    return result;
                }
            }
        }

        // 8. 使用回数制限チェック（中程度）
        if (characterSkillData && skill.usageCondition.usageLimit > 0) {
            const currentUsageCount = characterSkillData.skillUsageCounts.get(skill.id) || 0;
            if (currentUsageCount >= skill.usageCondition.usageLimit) {
                const result = this.createFailureResult('使用回数制限に達しています');
                this.cacheResult(cacheKey, result, startTime);
                return result;
            }
        }

        // 9. 装備要件チェック（中程度）
        const weaponRequirement = skill.usageCondition.weaponRequirement;
        if (weaponRequirement && weaponRequirement.length > 0) {
            const currentWeapon = caster.equipment?.weapon;
            if (!currentWeapon || !weaponRequirement.includes(currentWeapon)) {
                const result = this.createFailureResult(
                    `必要な武器を装備していません（必要: ${weaponRequirement.join(', ')}）`
                );
                this.cacheResult(cacheKey, result, startTime);
                return result;
            }
        }

        // 10. 職業要件チェック（軽い）
        const jobRequirement = skill.usageCondition.jobRequirement;
        if (jobRequirement && caster.job !== jobRequirement) {
            const result = this.createFailureResult(
                `必要な職業ではありません（必要: ${jobRequirement}, 現在: ${caster.job || 'なし'}）`
            );
            this.cacheResult(cacheKey, result, startTime);
            return result;
        }

        // 11. 状態異常チェック（重い）
        const statusEffects = caster.statusEffects || [];
        for (const statusEffect of statusEffects) {
            if (this.isBlockingStatus(statusEffect.type, skill.skillType)) {
                const result = this.createFailureResult(
                    `状態異常「${statusEffect.type}」により使用できません`
                );
                this.cacheResult(cacheKey, result, startTime);
                return result;
            }
        }

        // 12. 対象有効性チェック（最も重い）
        const hasValidTarget = this.hasValidTargetOptimized(skill, caster, targetPosition, battlefieldState);
        if (!hasValidTarget) {
            const result = this.createFailureResult('有効な対象がいません');
            this.cacheResult(cacheKey, result, startTime);
            return result;
        }

        // 全ての条件をクリア
        const successResult: SkillUsabilityResult = {
            canUse: true,
            message: 'スキルを使用できます'
        };

        this.cacheResult(cacheKey, successResult, startTime);
        return successResult;
    }

    /**
     * 最適化された対象有効性チェック
     * @param skill スキル
     * @param caster 使用者
     * @param targetPosition 対象位置
     * @param battlefieldState 戦場状態
     * @returns 有効な対象がいるか
     */
    private hasValidTargetOptimized(
        skill: Skill,
        caster: any,
        targetPosition: Position,
        battlefieldState: any
    ): boolean {
        // 効果範囲を計算（キャッシュから取得を試行）
        const rangeKey = `range_${skill.id}_${targetPosition.x}_${targetPosition.y}`;
        let affectedPositions = this.cache.get<Position[]>(rangeKey);

        if (!affectedPositions) {
            affectedPositions = skill.getAffectedPositions(targetPosition);
            this.cache.set(rangeKey, affectedPositions, affectedPositions.length);
        }

        // 効果範囲内の対象をチェック（早期リターン）
        for (const position of affectedPositions) {
            const character = battlefieldState.getCharacterAt?.(position);
            if (character && this.isValidTargetFast(skill, caster, character)) {
                return true; // 有効な対象が1つでも見つかれば即座に成功
            }
        }

        return false;
    }

    /**
     * 高速な対象有効性チェック
     * @param skill スキル
     * @param caster 使用者
     * @param target 対象
     * @returns 有効かどうか
     */
    private isValidTargetFast(skill: Skill, caster: any, target: any): boolean {
        // 最も軽いチェックから順に実行

        // 1. 存在チェック
        if (!target || !caster) {
            return false;
        }

        // 2. 生存状態チェック（回復スキル以外）
        if (target.currentHP <= 0 && skill.skillType !== 'heal') {
            return false;
        }

        // 3. 対象種別による判定（早期リターン）
        switch (skill.targetType) {
            case 'self':
                return target.id === caster.id;
            case 'single_ally':
            case 'area_ally':
            case 'all_allies':
                return target.faction === caster.faction && target.id !== caster.id;
            case 'single_enemy':
            case 'area_enemy':
            case 'all_enemies':
                return target.faction !== caster.faction;
            case 'single_any':
            case 'area_any':
            case 'all_any':
                return true;
            default:
                return false;
        }
    }

    /**
     * 状態異常がスキル使用を阻害するかチェック
     * @param statusType 状態異常種別
     * @param skillType スキル種別
     * @returns 阻害するかどうか
     */
    private isBlockingStatus(statusType: string, skillType: string): boolean {
        // 全スキルを阻害する状態異常
        const universalBlocking = ['paralysis', 'sleep', 'petrification', 'confusion'];
        if (universalBlocking.includes(statusType)) {
            return true;
        }

        // 魔法系スキルのみを阻害する状態異常
        if (statusType === 'silence') {
            return ['heal', 'buff', 'debuff', 'status'].includes(skillType);
        }

        return false;
    }

    /**
     * キャッシュキーを生成
     * @param skillId スキルID
     * @param casterId 使用者ID
     * @param targetPosition 対象位置
     * @returns キャッシュキー
     */
    private generateCacheKey(skillId: string, casterId: string, targetPosition: Position): string {
        return `${skillId}_${casterId}_${targetPosition.x}_${targetPosition.y}`;
    }

    /**
     * 失敗結果を作成
     * @param message エラーメッセージ
     * @returns 失敗結果
     */
    private createFailureResult(message: string): SkillUsabilityResult {
        return {
            canUse: false,
            message
        };
    }

    /**
     * 結果をキャッシュ
     * @param key キー
     * @param result 結果
     * @param timestamp タイムスタンプ
     */
    private cacheResult(key: string, result: SkillUsabilityResult, timestamp: number): void {
        this.lastCheckResults.set(key, { result, timestamp });

        // 古いキャッシュエントリを削除（メモリリーク防止）
        if (this.lastCheckResults.size > 1000) {
            const cutoffTime = timestamp - this.CACHE_DURATION * 10;
            for (const [k, v] of this.lastCheckResults.entries()) {
                if (v.timestamp < cutoffTime) {
                    this.lastCheckResults.delete(k);
                }
            }
        }
    }

    /**
     * キャッシュをクリア
     */
    clear(): void {
        this.lastCheckResults.clear();
    }
}

/**
 * パフォーマンス監視システム
 */
export class PerformanceMonitor {
    private metrics: PerformanceMetrics;
    private frameRateHistory: number[] = [];
    private executionTimeHistory: number[] = [];
    private lastFrameTime: number = 0;
    private monitoringInterval: number;
    private intervalId: number | null = null;

    constructor(monitoringInterval: number = 1000) {
        this.monitoringInterval = monitoringInterval;
        this.metrics = this.createInitialMetrics();
        this.startMonitoring();
    }

    /**
     * 初期メトリクスを作成
     * @returns 初期メトリクス
     */
    private createInitialMetrics(): PerformanceMetrics {
        return {
            averageExecutionTime: 0,
            maxExecutionTime: 0,
            averageConditionCheckTime: 0,
            cacheHits: 0,
            cacheMisses: 0,
            objectCreations: 0,
            objectReuses: 0,
            gcExecutions: 0,
            currentFPS: 60,
            lastUpdatedAt: new Date()
        };
    }

    /**
     * 監視を開始
     */
    private startMonitoring(): void {
        if (typeof window !== 'undefined' && window.requestAnimationFrame) {
            this.monitorFrameRate();
        }

        this.intervalId = window.setInterval(() => {
            this.updateMetrics();
        }, this.monitoringInterval);
    }

    /**
     * フレームレート監視
     */
    private monitorFrameRate(): void {
        const now = performance.now();
        if (this.lastFrameTime > 0) {
            const deltaTime = now - this.lastFrameTime;
            const fps = 1000 / deltaTime;

            this.frameRateHistory.push(fps);
            if (this.frameRateHistory.length > 60) {
                this.frameRateHistory.shift();
            }
        }
        this.lastFrameTime = now;

        requestAnimationFrame(() => this.monitorFrameRate());
    }

    /**
     * メトリクスを更新
     */
    private updateMetrics(): void {
        // フレームレートの平均を計算
        if (this.frameRateHistory.length > 0) {
            this.metrics.currentFPS = this.frameRateHistory.reduce((sum, fps) => sum + fps, 0) / this.frameRateHistory.length;
        }

        // 実行時間の平均を計算
        if (this.executionTimeHistory.length > 0) {
            this.metrics.averageExecutionTime = this.executionTimeHistory.reduce((sum, time) => sum + time, 0) / this.executionTimeHistory.length;
            this.metrics.maxExecutionTime = Math.max(...this.executionTimeHistory);
        }

        this.metrics.lastUpdatedAt = new Date();
    }

    /**
     * スキル実行時間を記録
     * @param executionTime 実行時間（ms）
     */
    recordExecutionTime(executionTime: number): void {
        this.executionTimeHistory.push(executionTime);
        if (this.executionTimeHistory.length > 100) {
            this.executionTimeHistory.shift();
        }
    }

    /**
     * キャッシュヒットを記録
     */
    recordCacheHit(): void {
        this.metrics.cacheHits++;
    }

    /**
     * キャッシュミスを記録
     */
    recordCacheMiss(): void {
        this.metrics.cacheMisses++;
    }

    /**
     * オブジェクト作成を記録
     */
    recordObjectCreation(): void {
        this.metrics.objectCreations++;
    }

    /**
     * オブジェクト再利用を記録
     */
    recordObjectReuse(): void {
        this.metrics.objectReuses++;
    }

    /**
     * 現在のメトリクスを取得
     * @returns パフォーマンスメトリクス
     */
    getMetrics(): PerformanceMetrics {
        return { ...this.metrics };
    }

    /**
     * メトリクスをリセット
     */
    resetMetrics(): void {
        this.metrics = this.createInitialMetrics();
        this.frameRateHistory.length = 0;
        this.executionTimeHistory.length = 0;
    }

    /**
     * 監視を停止
     */
    stopMonitoring(): void {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
    }

    /**
     * リソースを破棄
     */
    destroy(): void {
        this.stopMonitoring();
        this.frameRateHistory.length = 0;
        this.executionTimeHistory.length = 0;
    }
}

/**
 * スキルシステムパフォーマンス最適化統合管理
 */
export class SkillPerformanceManager {
    private config: PerformanceConfig;
    private dataCache: SkillDataCache;
    private objectPool: SkillObjectPool;
    private optimizedChecker: OptimizedConditionChecker;
    private performanceMonitor: PerformanceMonitor;
    private memoryUsage: MemoryUsageInfo;

    /** デフォルト設定 */
    private static readonly DEFAULT_CONFIG: PerformanceConfig = {
        maxCacheSize: 1000,
        maxPoolSize: 100,
        memoryLimitMB: 50,
        monitoringInterval: 1000,
        enableAutoCleanup: true,
        enableDetailedLogging: false
    };

    constructor(config?: Partial<PerformanceConfig>) {
        this.config = { ...SkillPerformanceManager.DEFAULT_CONFIG, ...config };

        this.dataCache = new SkillDataCache(this.config.maxCacheSize);
        this.objectPool = new SkillObjectPool(this.config.maxPoolSize);
        this.optimizedChecker = new OptimizedConditionChecker(this.dataCache);
        this.performanceMonitor = new PerformanceMonitor(this.config.monitoringInterval);

        this.memoryUsage = this.createInitialMemoryUsage();

        if (this.config.enableAutoCleanup) {
            this.startAutoCleanup();
        }

        this.log('SkillPerformanceManager initialized', this.config);
    }

    /**
     * 初期メモリ使用量情報を作成
     * @returns 初期メモリ使用量情報
     */
    private createInitialMemoryUsage(): MemoryUsageInfo {
        return {
            totalMemoryMB: 0,
            skillCacheMemoryMB: 0,
            objectPoolMemoryMB: 0,
            activeSkillCount: 0,
            cacheHitRate: 0,
            poolUsageRate: 0,
            lastMeasuredAt: new Date()
        };
    }

    /**
     * 自動クリーンアップを開始
     */
    private startAutoCleanup(): void {
        setInterval(() => {
            this.performCleanup();
        }, this.config.monitoringInterval * 5); // 5倍の間隔でクリーンアップ
    }

    /**
     * クリーンアップを実行
     */
    private performCleanup(): void {
        const memoryUsage = this.getMemoryUsage();

        if (memoryUsage.totalMemoryMB > this.config.memoryLimitMB) {
            this.log('Memory limit exceeded, performing cleanup', {
                currentMemory: memoryUsage.totalMemoryMB,
                limit: this.config.memoryLimitMB
            });

            // キャッシュサイズを削減
            const cacheStats = this.dataCache.getStatistics();
            if (cacheStats.size > this.config.maxCacheSize * 0.8) {
                // キャッシュの20%を削除
                const keysToDelete = Math.floor(cacheStats.size * 0.2);
                // 実際の削除処理は SkillDataCache の LRU 機能に依存
                this.log('Cache cleanup triggered', { keysToDelete });
            }

            // ガベージコレクションを促す（可能な場合）
            if (typeof window !== 'undefined' && (window as any).gc) {
                (window as any).gc();
                this.performanceMonitor.recordObjectCreation(); // GC実行をカウント
            }
        }
    }

    /**
     * 最適化されたスキル条件チェック
     * @param skill スキル
     * @param casterId 使用者ID
     * @param targetPosition 対象位置
     * @param battlefieldState 戦場状態
     * @param characterSkillData キャラクタースキルデータ
     * @returns 使用可能性結果
     */
    canUseSkillOptimized(
        skill: Skill,
        casterId: string,
        targetPosition: Position,
        battlefieldState: any,
        characterSkillData?: CharacterSkillData
    ): SkillUsabilityResult {
        const startTime = performance.now();

        const result = this.optimizedChecker.canUseSkillOptimized(
            skill,
            casterId,
            targetPosition,
            battlefieldState,
            characterSkillData
        );

        const executionTime = performance.now() - startTime;
        this.performanceMonitor.recordExecutionTime(executionTime);

        return result;
    }

    /**
     * スキルオブジェクトを取得（プールから）
     * @param skillType スキル種別
     * @param skillData スキルデータ
     * @returns スキルオブジェクト
     */
    acquireSkillObject(skillType: string, skillData: SkillData): Skill | null {
        const pooledSkill = this.objectPool.acquire(skillType, skillData);

        if (pooledSkill) {
            this.performanceMonitor.recordObjectReuse();
            return pooledSkill;
        } else {
            this.performanceMonitor.recordObjectCreation();
            this.objectPool.incrementCreatedCount();
            return null; // 新規作成が必要
        }
    }

    /**
     * スキルオブジェクトを返却（プールに）
     * @param skill スキルオブジェクト
     */
    releaseSkillObject(skill: Skill): void {
        this.objectPool.release(skill);
    }

    /**
     * データをキャッシュに保存
     * @param key キー
     * @param data データ
     * @param estimatedSize データサイズ（概算）
     */
    cacheData<T>(key: string, data: T, estimatedSize?: number): void {
        this.dataCache.set(key, data, estimatedSize);
        this.performanceMonitor.recordCacheMiss(); // 新規キャッシュ
    }

    /**
     * キャッシュからデータを取得
     * @param key キー
     * @returns キャッシュされたデータ
     */
    getCachedData<T>(key: string): T | null {
        const data = this.dataCache.get<T>(key);

        if (data) {
            this.performanceMonitor.recordCacheHit();
        } else {
            this.performanceMonitor.recordCacheMiss();
        }

        return data;
    }

    /**
     * メモリ使用量を取得
     * @returns メモリ使用量情報
     */
    getMemoryUsage(): MemoryUsageInfo {
        const cacheStats = this.dataCache.getStatistics();
        const poolStats = this.objectPool.getStatistics();

        this.memoryUsage = {
            totalMemoryMB: this.estimateTotalMemoryUsage(),
            skillCacheMemoryMB: this.estimateCacheMemoryUsage(cacheStats),
            objectPoolMemoryMB: this.estimatePoolMemoryUsage(poolStats),
            activeSkillCount: poolStats.createdObjects - poolStats.totalPooledObjects,
            cacheHitRate: cacheStats.hitRate,
            poolUsageRate: poolStats.reuseRate,
            lastMeasuredAt: new Date()
        };

        return { ...this.memoryUsage };
    }

    /**
     * パフォーマンスメトリクスを取得
     * @returns パフォーマンスメトリクス
     */
    getPerformanceMetrics(): PerformanceMetrics {
        return this.performanceMonitor.getMetrics();
    }

    /**
     * 総メモリ使用量を推定
     * @returns 推定メモリ使用量（MB）
     */
    private estimateTotalMemoryUsage(): number {
        // 簡易的な推定（実際の実装では、より正確な測定が必要）
        const cacheStats = this.dataCache.getStatistics();
        const poolStats = this.objectPool.getStatistics();

        return (cacheStats.totalSize * 0.001) + (poolStats.totalPooledObjects * 0.01);
    }

    /**
     * キャッシュメモリ使用量を推定
     * @param cacheStats キャッシュ統計
     * @returns 推定メモリ使用量（MB）
     */
    private estimateCacheMemoryUsage(cacheStats: any): number {
        return cacheStats.totalSize * 0.001; // 1KB = 0.001MB として概算
    }

    /**
     * プールメモリ使用量を推定
     * @param poolStats プール統計
     * @returns 推定メモリ使用量（MB）
     */
    private estimatePoolMemoryUsage(poolStats: any): number {
        return poolStats.totalPooledObjects * 0.01; // 1オブジェクト = 0.01MB として概算
    }

    /**
     * 統計情報を取得
     * @returns 統計情報
     */
    getStatistics(): {
        cache: any;
        pool: any;
        performance: PerformanceMetrics;
        memory: MemoryUsageInfo;
    } {
        return {
            cache: this.dataCache.getStatistics(),
            pool: this.objectPool.getStatistics(),
            performance: this.getPerformanceMetrics(),
            memory: this.getMemoryUsage()
        };
    }

    /**
     * システムをリセット
     */
    reset(): void {
        this.dataCache.clear();
        this.objectPool.clear();
        this.optimizedChecker.clear();
        this.performanceMonitor.resetMetrics();
        this.memoryUsage = this.createInitialMemoryUsage();

        this.log('SkillPerformanceManager reset');
    }

    /**
     * ログ出力
     * @param message メッセージ
     * @param data 追加データ
     */
    private log(message: string, data?: any): void {
        if (this.config.enableDetailedLogging) {
            console.log(`[SkillPerformanceManager] ${message}`, data || '');
        }
    }

    /**
     * リソースを破棄
     */
    destroy(): void {
        this.performanceMonitor.destroy();
        this.reset();
        this.log('SkillPerformanceManager destroyed');
    }
}