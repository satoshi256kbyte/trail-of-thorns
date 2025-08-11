/**
 * AIパフォーマンス監視システム
 * AI思考時間、メモリ使用量、パフォーマンス最適化を管理
 */

import {
    AIPerformanceMetrics,
    AIPerformanceStats,
    ActionType,
    AIAction,
    AIContext,
    Unit
} from '../../types/ai';

/**
 * パフォーマンスアラート情報
 */
export interface PerformanceAlert {
    /** アラートの種類 */
    type: 'thinking_time' | 'memory_usage' | 'error_rate' | 'timeout';
    /** アラートレベル */
    level: 'warning' | 'critical';
    /** アラートメッセージ */
    message: string;
    /** 現在の値 */
    currentValue: number;
    /** 閾値 */
    threshold: number;
    /** 発生時刻 */
    timestamp: number;
}

/**
 * 行動キャッシュエントリ
 */
interface ActionCacheEntry {
    /** キャッシュキー */
    key: string;
    /** キャッシュされた行動 */
    action: AIAction;
    /** キャッシュ作成時刻 */
    timestamp: number;
    /** 使用回数 */
    hitCount: number;
}

/**
 * 思考時間記録
 */
interface ThinkingTimeRecord {
    /** キャラクターID */
    characterId: string;
    /** 思考開始時刻 */
    startTime: number;
    /** 思考終了時刻 */
    endTime: number;
    /** 思考時間（ミリ秒） */
    duration: number;
    /** タイムアウトフラグ */
    timedOut: boolean;
}

/**
 * メモリ使用量記録
 */
interface MemoryUsageRecord {
    /** 記録時刻 */
    timestamp: number;
    /** ヒープ使用量（バイト） */
    heapUsed: number;
    /** ヒープ総量（バイト） */
    heapTotal: number;
    /** 外部メモリ使用量（バイト） */
    external: number;
}

/**
 * AIパフォーマンス監視クラス
 */
export class AIPerformanceMonitor {
    private static instance: AIPerformanceMonitor;

    // パフォーマンス記録
    private thinkingTimeRecords: ThinkingTimeRecord[] = [];
    private memoryUsageRecords: MemoryUsageRecord[] = [];
    private errorCounts: Map<string, number> = new Map();
    private actionTypeDistribution: Map<ActionType, number> = new Map();

    // 行動キャッシュ
    private actionCache: Map<string, ActionCacheEntry> = new Map();
    private readonly maxCacheSize = 1000;
    private readonly cacheExpirationTime = 30000; // 30秒

    // 並列処理管理
    private activeThinkingTasks: Map<string, Promise<AIAction>> = new Map();
    private readonly maxConcurrentThinking = 4;

    // 設定値
    private readonly thinkingTimeLimit = 2000; // 2秒
    private readonly memoryWarningThreshold = 50 * 1024 * 1024; // 50MB
    private readonly memoryCriticalThreshold = 100 * 1024 * 1024; // 100MB
    private readonly errorRateWarningThreshold = 0.1; // 10%
    private readonly errorRateCriticalThreshold = 0.25; // 25%

    // 監視状態
    private isMonitoring = false;
    private monitoringInterval: NodeJS.Timeout | null = null;

    private constructor() {
        this.initializeActionTypeDistribution();
    }

    /**
     * シングルトンインスタンスを取得
     */
    public static getInstance(): AIPerformanceMonitor {
        if (!AIPerformanceMonitor.instance) {
            AIPerformanceMonitor.instance = new AIPerformanceMonitor();
        }
        return AIPerformanceMonitor.instance;
    }

    /**
     * 監視を開始
     */
    public startMonitoring(): void {
        if (this.isMonitoring) {
            return;
        }

        this.isMonitoring = true;
        this.monitoringInterval = setInterval(() => {
            this.recordMemoryUsage();
            this.cleanupExpiredCache();
            this.checkPerformanceThresholds();
        }, 1000); // 1秒間隔

        console.log('[AIPerformanceMonitor] Monitoring started');
    }

    /**
     * 監視を停止
     */
    public stopMonitoring(): void {
        if (!this.isMonitoring) {
            return;
        }

        this.isMonitoring = false;
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.monitoringInterval = null;
        }

        console.log('[AIPerformanceMonitor] Monitoring stopped');
    }

    /**
     * 思考時間を記録開始
     */
    public startThinkingTimer(characterId: string): void {
        const record: ThinkingTimeRecord = {
            characterId,
            startTime: Date.now(),
            endTime: 0,
            duration: 0,
            timedOut: false
        };

        // 既存の記録を更新または新規追加
        const existingIndex = this.thinkingTimeRecords.findIndex(
            r => r.characterId === characterId && r.endTime === 0
        );

        if (existingIndex >= 0) {
            this.thinkingTimeRecords[existingIndex] = record;
        } else {
            this.thinkingTimeRecords.push(record);
        }
    }

    /**
     * 思考時間を記録終了
     */
    public endThinkingTimer(characterId: string, timedOut = false): number {
        const recordIndex = this.thinkingTimeRecords.findIndex(
            r => r.characterId === characterId && r.endTime === 0
        );

        if (recordIndex === -1) {
            console.warn(`[AIPerformanceMonitor] No thinking timer found for character: ${characterId}`);
            return 0;
        }

        const record = this.thinkingTimeRecords[recordIndex];
        record.endTime = Date.now();
        record.duration = record.endTime - record.startTime;
        record.timedOut = timedOut;

        // 古い記録を削除（最新1000件のみ保持）
        if (this.thinkingTimeRecords.length > 1000) {
            this.thinkingTimeRecords = this.thinkingTimeRecords.slice(-1000);
        }

        return record.duration;
    }

    /**
     * メモリ使用量を記録
     */
    public recordMemoryUsage(): void {
        if (typeof process !== 'undefined' && process.memoryUsage) {
            const memUsage = process.memoryUsage();
            const record: MemoryUsageRecord = {
                timestamp: Date.now(),
                heapUsed: memUsage.heapUsed,
                heapTotal: memUsage.heapTotal,
                external: memUsage.external
            };

            this.memoryUsageRecords.push(record);

            // 古い記録を削除（最新1000件のみ保持）
            if (this.memoryUsageRecords.length > 1000) {
                this.memoryUsageRecords = this.memoryUsageRecords.slice(-1000);
            }
        }
    }

    /**
     * エラーを記録
     */
    public recordError(errorType: string): void {
        const currentCount = this.errorCounts.get(errorType) || 0;
        this.errorCounts.set(errorType, currentCount + 1);
    }

    /**
     * 行動タイプを記録
     */
    public recordActionType(actionType: ActionType): void {
        const currentCount = this.actionTypeDistribution.get(actionType) || 0;
        this.actionTypeDistribution.set(actionType, currentCount + 1);
    }

    /**
     * 行動をキャッシュに保存
     */
    public cacheAction(context: AIContext, action: AIAction): void {
        const cacheKey = this.generateCacheKey(context);
        const entry: ActionCacheEntry = {
            key: cacheKey,
            action: { ...action },
            timestamp: Date.now(),
            hitCount: 0
        };

        this.actionCache.set(cacheKey, entry);

        // キャッシュサイズ制限
        if (this.actionCache.size > this.maxCacheSize) {
            this.evictOldestCacheEntry();
        }
    }

    /**
     * キャッシュから行動を取得
     */
    public getCachedAction(context: AIContext): AIAction | null {
        const cacheKey = this.generateCacheKey(context);
        const entry = this.actionCache.get(cacheKey);

        if (!entry) {
            return null;
        }

        // 有効期限チェック
        if (Date.now() - entry.timestamp > this.cacheExpirationTime) {
            this.actionCache.delete(cacheKey);
            return null;
        }

        entry.hitCount++;
        return { ...entry.action };
    }

    /**
     * 並列思考処理を実行
     */
    public async executeParallelThinking(
        characters: Unit[],
        thinkingFunction: (character: Unit) => Promise<AIAction>
    ): Promise<Map<string, AIAction>> {
        const results = new Map<string, AIAction>();
        const batches: Unit[][] = [];

        // キャラクターをバッチに分割
        for (let i = 0; i < characters.length; i += this.maxConcurrentThinking) {
            batches.push(characters.slice(i, i + this.maxConcurrentThinking));
        }

        // バッチごとに並列実行
        for (const batch of batches) {
            const promises = batch.map(async (character) => {
                const startTime = Date.now();
                this.startThinkingTimer(character.id);

                try {
                    // タイムアウト付きで実行
                    const action = await Promise.race([
                        thinkingFunction(character),
                        this.createTimeoutPromise(character.id)
                    ]);

                    const duration = this.endThinkingTimer(character.id);
                    this.recordActionType(action.type);

                    return { characterId: character.id, action };
                } catch (error) {
                    this.endThinkingTimer(character.id, true);
                    this.recordError('thinking_error');

                    // フォールバック行動
                    const fallbackAction: AIAction = {
                        type: ActionType.WAIT,
                        priority: 0,
                        reasoning: 'Parallel thinking error - using fallback'
                    };

                    return { characterId: character.id, action: fallbackAction };
                }
            });

            const batchResults = await Promise.all(promises);
            batchResults.forEach(({ characterId, action }) => {
                results.set(characterId, action);
            });
        }

        return results;
    }

    /**
     * パフォーマンス統計を取得
     */
    public getPerformanceStats(): AIPerformanceStats {
        const completedRecords = this.thinkingTimeRecords.filter(r => r.endTime > 0);
        const thinkingTimes = completedRecords.map(r => r.duration);
        const totalErrors = Array.from(this.errorCounts.values()).reduce((sum, count) => sum + count, 0);
        const totalActions = Array.from(this.actionTypeDistribution.values()).reduce((sum, count) => sum + count, 0);

        return {
            averageThinkingTime: thinkingTimes.length > 0 ?
                thinkingTimes.reduce((sum, time) => sum + time, 0) / thinkingTimes.length : 0,
            maxThinkingTime: thinkingTimes.length > 0 ? Math.max(...thinkingTimes) : 0,
            timeoutCount: completedRecords.filter(r => r.timedOut).length,
            totalActions,
            successfulActions: totalActions - totalErrors,
            errorCount: totalErrors,
            memoryUsage: this.getCurrentMemoryUsage()
        };
    }

    /**
     * パフォーマンスメトリクスを取得
     */
    public getPerformanceMetrics(): AIPerformanceMetrics {
        const completedRecords = this.thinkingTimeRecords.filter(r => r.endTime > 0);
        const thinkingTimes = completedRecords.map(r => r.duration);
        const totalErrors = Array.from(this.errorCounts.values()).reduce((sum, count) => sum + count, 0);
        const totalActions = Array.from(this.actionTypeDistribution.values()).reduce((sum, count) => sum + count, 0);

        const actionTypeDistribution: Record<ActionType, number> = {} as Record<ActionType, number>;
        Object.values(ActionType).forEach(type => {
            actionTypeDistribution[type] = this.actionTypeDistribution.get(type) || 0;
        });

        return {
            averageThinkingTime: thinkingTimes.length > 0 ?
                thinkingTimes.reduce((sum, time) => sum + time, 0) / thinkingTimes.length : 0,
            maxThinkingTime: thinkingTimes.length > 0 ? Math.max(...thinkingTimes) : 0,
            minThinkingTime: thinkingTimes.length > 0 ? Math.min(...thinkingTimes) : 0,
            totalDecisions: totalActions,
            timeoutCount: completedRecords.filter(r => r.timedOut).length,
            errorCount: totalErrors,
            memoryUsage: this.getCurrentMemoryUsage(),
            actionTypeDistribution
        };
    }

    /**
     * パフォーマンス閾値をチェック
     */
    public checkPerformanceThresholds(): PerformanceAlert[] {
        const alerts: PerformanceAlert[] = [];
        const stats = this.getPerformanceStats();

        // 思考時間チェック
        if (stats.averageThinkingTime > this.thinkingTimeLimit * 0.8) {
            alerts.push({
                type: 'thinking_time',
                level: stats.averageThinkingTime > this.thinkingTimeLimit ? 'critical' : 'warning',
                message: `Average thinking time is ${stats.averageThinkingTime.toFixed(0)}ms`,
                currentValue: stats.averageThinkingTime,
                threshold: this.thinkingTimeLimit,
                timestamp: Date.now()
            });
        }

        // メモリ使用量チェック
        if (stats.memoryUsage > this.memoryWarningThreshold) {
            alerts.push({
                type: 'memory_usage',
                level: stats.memoryUsage > this.memoryCriticalThreshold ? 'critical' : 'warning',
                message: `Memory usage is ${(stats.memoryUsage / 1024 / 1024).toFixed(1)}MB`,
                currentValue: stats.memoryUsage,
                threshold: this.memoryWarningThreshold,
                timestamp: Date.now()
            });
        }

        // エラー率チェック
        if (stats.totalActions > 0) {
            const errorRate = stats.errorCount / stats.totalActions;
            if (errorRate > this.errorRateWarningThreshold) {
                alerts.push({
                    type: 'error_rate',
                    level: errorRate > this.errorRateCriticalThreshold ? 'critical' : 'warning',
                    message: `Error rate is ${(errorRate * 100).toFixed(1)}%`,
                    currentValue: errorRate,
                    threshold: this.errorRateWarningThreshold,
                    timestamp: Date.now()
                });
            }
        }

        // タイムアウト率チェック
        if (stats.totalActions > 0) {
            const timeoutRate = stats.timeoutCount / stats.totalActions;
            if (timeoutRate > 0.05) { // 5%以上
                alerts.push({
                    type: 'timeout',
                    level: timeoutRate > 0.1 ? 'critical' : 'warning',
                    message: `Timeout rate is ${(timeoutRate * 100).toFixed(1)}%`,
                    currentValue: timeoutRate,
                    threshold: 0.05,
                    timestamp: Date.now()
                });
            }
        }

        return alerts;
    }

    /**
     * キャッシュ統計を取得
     */
    public getCacheStats(): {
        size: number;
        hitRate: number;
        totalHits: number;
        oldestEntry: number;
    } {
        const totalHits = Array.from(this.actionCache.values())
            .reduce((sum, entry) => sum + entry.hitCount, 0);
        const totalRequests = totalHits + this.actionCache.size; // 簡易計算

        const oldestTimestamp = Math.min(
            ...Array.from(this.actionCache.values()).map(entry => entry.timestamp)
        );

        return {
            size: this.actionCache.size,
            hitRate: totalRequests > 0 ? totalHits / totalRequests : 0,
            totalHits,
            oldestEntry: oldestTimestamp
        };
    }

    /**
     * 統計をリセット
     */
    public resetStats(): void {
        this.thinkingTimeRecords = [];
        this.memoryUsageRecords = [];
        this.errorCounts.clear();
        this.actionTypeDistribution.clear();
        this.actionCache.clear();
        this.initializeActionTypeDistribution();

        console.log('[AIPerformanceMonitor] Statistics reset');
    }

    /**
     * メモリクリーンアップを実行
     */
    public performMemoryCleanup(): void {
        // キャッシュクリア
        this.actionCache.clear();

        // 古い記録を削除
        const cutoffTime = Date.now() - 300000; // 5分前
        this.thinkingTimeRecords = this.thinkingTimeRecords.filter(
            record => record.startTime > cutoffTime
        );
        this.memoryUsageRecords = this.memoryUsageRecords.filter(
            record => record.timestamp > cutoffTime
        );

        // ガベージコレクション実行（可能な場合）
        if (typeof global !== 'undefined' && global.gc) {
            global.gc();
        }

        console.log('[AIPerformanceMonitor] Memory cleanup performed');
    }

    // ========================================
    // プライベートメソッド
    // ========================================

    /**
     * 行動タイプ分布を初期化
     */
    private initializeActionTypeDistribution(): void {
        Object.values(ActionType).forEach(type => {
            this.actionTypeDistribution.set(type, 0);
        });
    }

    /**
     * キャッシュキーを生成
     */
    private generateCacheKey(context: AIContext): string {
        const keyParts = [
            context.currentCharacter.id,
            context.currentCharacter.position.x,
            context.currentCharacter.position.y,
            context.currentCharacter.currentHP,
            context.visibleEnemies.length,
            context.visibleAllies.length,
            context.npcs.length,
            context.turnNumber
        ];

        return keyParts.join('|');
    }

    /**
     * 最も古いキャッシュエントリを削除
     */
    private evictOldestCacheEntry(): void {
        let oldestKey = '';
        let oldestTimestamp = Date.now();

        for (const [key, entry] of this.actionCache) {
            if (entry.timestamp < oldestTimestamp) {
                oldestTimestamp = entry.timestamp;
                oldestKey = key;
            }
        }

        if (oldestKey) {
            this.actionCache.delete(oldestKey);
        }
    }

    /**
     * 期限切れキャッシュをクリーンアップ
     */
    private cleanupExpiredCache(): void {
        const now = Date.now();
        const expiredKeys: string[] = [];

        for (const [key, entry] of this.actionCache) {
            if (now - entry.timestamp > this.cacheExpirationTime) {
                expiredKeys.push(key);
            }
        }

        expiredKeys.forEach(key => this.actionCache.delete(key));
    }

    /**
     * タイムアウトPromiseを作成
     */
    private createTimeoutPromise(characterId: string): Promise<AIAction> {
        return new Promise((_, reject) => {
            setTimeout(() => {
                reject(new Error(`AI thinking timeout for character: ${characterId}`));
            }, this.thinkingTimeLimit);
        });
    }

    /**
     * 現在のメモリ使用量を取得
     */
    private getCurrentMemoryUsage(): number {
        if (typeof process !== 'undefined' && process.memoryUsage) {
            return process.memoryUsage().heapUsed;
        }
        return 0;
    }
}

/**
 * AIパフォーマンス監視のユーティリティ関数
 */
export class AIPerformanceUtils {
    /**
     * 思考時間を測定してアクションを実行
     */
    public static async measureThinkingTime<T>(
        characterId: string,
        thinkingFunction: () => Promise<T>
    ): Promise<{ result: T; duration: number }> {
        const monitor = AIPerformanceMonitor.getInstance();
        monitor.startThinkingTimer(characterId);

        try {
            const result = await thinkingFunction();
            const duration = monitor.endThinkingTimer(characterId);
            return { result, duration };
        } catch (error) {
            monitor.endThinkingTimer(characterId, true);
            monitor.recordError('thinking_execution_error');
            throw error;
        }
    }

    /**
     * メモリ使用量を監視してアクションを実行
     */
    public static async monitorMemoryUsage<T>(
        action: () => Promise<T>
    ): Promise<T> {
        const monitor = AIPerformanceMonitor.getInstance();
        const initialMemory = monitor.getCurrentMemoryUsage();

        try {
            const result = await action();
            const finalMemory = monitor.getCurrentMemoryUsage();
            const memoryDelta = finalMemory - initialMemory;

            if (memoryDelta > 10 * 1024 * 1024) { // 10MB以上の増加
                console.warn(`[AIPerformanceUtils] Large memory increase detected: ${(memoryDelta / 1024 / 1024).toFixed(1)}MB`);
            }

            return result;
        } catch (error) {
            monitor.recordError('memory_monitoring_error');
            throw error;
        }
    }

    /**
     * パフォーマンス統計をコンソールに出力
     */
    public static logPerformanceStats(): void {
        const monitor = AIPerformanceMonitor.getInstance();
        const stats = monitor.getPerformanceStats();
        const cacheStats = monitor.getCacheStats();

        console.log('=== AI Performance Statistics ===');
        console.log(`Average Thinking Time: ${stats.averageThinkingTime.toFixed(2)}ms`);
        console.log(`Max Thinking Time: ${stats.maxThinkingTime.toFixed(2)}ms`);
        console.log(`Total Actions: ${stats.totalActions}`);
        console.log(`Successful Actions: ${stats.successfulActions}`);
        console.log(`Error Count: ${stats.errorCount}`);
        console.log(`Timeout Count: ${stats.timeoutCount}`);
        console.log(`Memory Usage: ${(stats.memoryUsage / 1024 / 1024).toFixed(1)}MB`);
        console.log(`Cache Size: ${cacheStats.size}`);
        console.log(`Cache Hit Rate: ${(cacheStats.hitRate * 100).toFixed(1)}%`);
        console.log('================================');
    }
}