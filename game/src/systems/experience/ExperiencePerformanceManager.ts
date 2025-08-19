/**
 * ExperiencePerformanceManager - 経験値システムパフォーマンス監視・最適化
 * 
 * このクラスは経験値システムのパフォーマンス監視と最適化を担当します:
 * - パフォーマンス指標の監視
 * - メモリ使用量の追跡
 * - 処理時間の測定
 * - 最適化の提案と実行
 * - リソース解放の管理
 * 
 * 要件: 8.1, 8.2, 8.3, 8.4, 8.5
 * 
 * @version 1.0.0
 * @author Trail of Thorns Development Team
 */

/**
 * パフォーマンス指標
 */
export interface PerformanceMetrics {
    // 処理時間指標
    experienceCalculationTime: number;
    levelUpProcessingTime: number;
    uiUpdateTime: number;
    batchProcessingTime: number;

    // メモリ指標
    memoryUsage: number;
    objectCount: number;
    cacheSize: number;
    poolSize: number;

    // 処理量指標
    experienceOperationsPerSecond: number;
    levelUpsPerSecond: number;
    uiUpdatesPerSecond: number;

    // エラー指標
    errorCount: number;
    warningCount: number;

    // 最終更新時刻
    lastUpdated: number;
}

/**
 * パフォーマンス設定
 */
export interface PerformanceConfig {
    // 監視設定
    monitoringEnabled: boolean;
    metricsUpdateInterval: number;
    performanceLoggingEnabled: boolean;

    // 閾値設定
    maxExperienceCalculationTime: number;
    maxLevelUpProcessingTime: number;
    maxMemoryUsage: number;
    maxObjectCount: number;

    // 最適化設定
    autoOptimizationEnabled: boolean;
    cacheOptimizationEnabled: boolean;
    poolOptimizationEnabled: boolean;
    garbageCollectionEnabled: boolean;

    // アラート設定
    performanceAlertsEnabled: boolean;
    memoryAlertsEnabled: boolean;
}

/**
 * パフォーマンス警告
 */
export interface PerformanceAlert {
    type: 'performance' | 'memory' | 'error';
    severity: 'low' | 'medium' | 'high' | 'critical';
    message: string;
    metrics: Partial<PerformanceMetrics>;
    timestamp: number;
    suggestions: string[];
}

/**
 * 最適化結果
 */
export interface OptimizationResult {
    success: boolean;
    optimizationType: string;
    beforeMetrics: Partial<PerformanceMetrics>;
    afterMetrics: Partial<PerformanceMetrics>;
    improvement: number;
    message: string;
}

/**
 * ExperiencePerformanceManagerクラス
 * 経験値システムのパフォーマンス監視と最適化を管理
 */
export class ExperiencePerformanceManager {
    private static instance: ExperiencePerformanceManager;

    private config: PerformanceConfig;
    private metrics: PerformanceMetrics;
    private isMonitoring: boolean = false;

    // 監視用タイマー
    private monitoringTimer: NodeJS.Timeout | null = null;
    private metricsHistory: PerformanceMetrics[] = [];
    private readonly MAX_HISTORY_SIZE = 100;

    // パフォーマンス測定用
    private operationTimers: Map<string, number> = new Map();
    private operationCounts: Map<string, number> = new Map();
    private lastMetricsUpdate: number = 0;

    // アラート管理
    private activeAlerts: Set<string> = new Set();
    private alertCallbacks: ((alert: PerformanceAlert) => void)[] = [];

    // 最適化コンポーネント参照
    private cacheManager?: any;
    private objectPoolManager?: any;
    private batchProcessor?: any;

    private constructor() {
        this.config = this.getDefaultConfig();
        this.metrics = this.getInitialMetrics();
        this.initializeMonitoring();
    }

    /**
     * シングルトンインスタンスを取得
     */
    public static getInstance(): ExperiencePerformanceManager {
        if (!ExperiencePerformanceManager.instance) {
            ExperiencePerformanceManager.instance = new ExperiencePerformanceManager();
        }
        return ExperiencePerformanceManager.instance;
    }

    /**
     * パフォーマンス監視を開始
     */
    public startMonitoring(): void {
        if (this.isMonitoring) {
            return;
        }

        this.isMonitoring = true;
        this.lastMetricsUpdate = Date.now();

        if (this.config.monitoringEnabled) {
            this.monitoringTimer = setInterval(() => {
                this.updateMetrics();
                this.checkPerformanceThresholds();
                this.performAutoOptimization();
            }, this.config.metricsUpdateInterval);

            console.log('Experience performance monitoring started');
        }
    }

    /**
     * パフォーマンス監視を停止
     */
    public stopMonitoring(): void {
        if (!this.isMonitoring) {
            return;
        }

        this.isMonitoring = false;

        if (this.monitoringTimer) {
            clearInterval(this.monitoringTimer);
            this.monitoringTimer = null;
        }

        console.log('Experience performance monitoring stopped');
    }

    /**
     * 処理時間を測定開始
     */
    public startTimer(operationName: string): void {
        this.operationTimers.set(operationName, performance.now());
    }

    /**
     * 処理時間を測定終了
     */
    public endTimer(operationName: string): number {
        const startTime = this.operationTimers.get(operationName);
        if (!startTime) {
            console.warn(`Timer not found for operation: ${operationName}`);
            return 0;
        }

        const duration = performance.now() - startTime;
        this.operationTimers.delete(operationName);

        // 操作回数をカウント
        const currentCount = this.operationCounts.get(operationName) || 0;
        this.operationCounts.set(operationName, currentCount + 1);

        // メトリクスを更新
        this.updateOperationMetrics(operationName, duration);

        return duration;
    }

    /**
     * メモリ使用量を記録
     */
    public recordMemoryUsage(objectType: string, size: number): void {
        this.metrics.memoryUsage += size;
        this.metrics.objectCount++;

        if (this.config.performanceLoggingEnabled) {
            console.debug(`Memory allocated: ${objectType} (+${size} bytes)`);
        }
    }

    /**
     * メモリ解放を記録
     */
    public recordMemoryRelease(objectType: string, size: number): void {
        this.metrics.memoryUsage = Math.max(0, this.metrics.memoryUsage - size);
        this.metrics.objectCount = Math.max(0, this.metrics.objectCount - 1);

        if (this.config.performanceLoggingEnabled) {
            console.debug(`Memory released: ${objectType} (-${size} bytes)`);
        }
    }

    /**
     * 現在のパフォーマンス指標を取得
     */
    public getMetrics(): PerformanceMetrics {
        return { ...this.metrics };
    }

    /**
     * パフォーマンス履歴を取得
     */
    public getMetricsHistory(): PerformanceMetrics[] {
        return [...this.metricsHistory];
    }

    /**
     * パフォーマンス設定を更新
     */
    public updateConfig(newConfig: Partial<PerformanceConfig>): void {
        this.config = { ...this.config, ...newConfig };

        if (this.config.monitoringEnabled && !this.isMonitoring) {
            this.startMonitoring();
        } else if (!this.config.monitoringEnabled && this.isMonitoring) {
            this.stopMonitoring();
        }
    }

    /**
     * 最適化コンポーネントを登録
     */
    public registerOptimizationComponents(components: {
        cacheManager?: any;
        objectPoolManager?: any;
        batchProcessor?: any;
    }): void {
        this.cacheManager = components.cacheManager;
        this.objectPoolManager = components.objectPoolManager;
        this.batchProcessor = components.batchProcessor;
    }

    /**
     * 手動最適化を実行
     */
    public async performOptimization(type?: string): Promise<OptimizationResult[]> {
        const results: OptimizationResult[] = [];

        try {
            if (!type || type === 'cache') {
                const cacheResult = await this.optimizeCache();
                if (cacheResult) results.push(cacheResult);
            }

            if (!type || type === 'pool') {
                const poolResult = await this.optimizeObjectPool();
                if (poolResult) results.push(poolResult);
            }

            if (!type || type === 'memory') {
                const memoryResult = await this.optimizeMemory();
                if (memoryResult) results.push(memoryResult);
            }

            if (!type || type === 'batch') {
                const batchResult = await this.optimizeBatchProcessing();
                if (batchResult) results.push(batchResult);
            }

            console.log(`Optimization completed: ${results.length} optimizations performed`);
            return results;

        } catch (error) {
            console.error('Optimization failed:', error);
            return [];
        }
    }

    /**
     * パフォーマンスアラートコールバックを追加
     */
    public onPerformanceAlert(callback: (alert: PerformanceAlert) => void): void {
        this.alertCallbacks.push(callback);
    }

    /**
     * パフォーマンスレポートを生成
     */
    public generatePerformanceReport(): string {
        const report = [
            '=== Experience System Performance Report ===',
            `Generated: ${new Date().toISOString()}`,
            '',
            '--- Current Metrics ---',
            `Experience Calculation Time: ${this.metrics.experienceCalculationTime.toFixed(2)}ms`,
            `Level Up Processing Time: ${this.metrics.levelUpProcessingTime.toFixed(2)}ms`,
            `UI Update Time: ${this.metrics.uiUpdateTime.toFixed(2)}ms`,
            `Batch Processing Time: ${this.metrics.batchProcessingTime.toFixed(2)}ms`,
            '',
            `Memory Usage: ${(this.metrics.memoryUsage / 1024 / 1024).toFixed(2)}MB`,
            `Object Count: ${this.metrics.objectCount}`,
            `Cache Size: ${this.metrics.cacheSize}`,
            `Pool Size: ${this.metrics.poolSize}`,
            '',
            `Experience Operations/sec: ${this.metrics.experienceOperationsPerSecond.toFixed(1)}`,
            `Level Ups/sec: ${this.metrics.levelUpsPerSecond.toFixed(1)}`,
            `UI Updates/sec: ${this.metrics.uiUpdatesPerSecond.toFixed(1)}`,
            '',
            `Errors: ${this.metrics.errorCount}`,
            `Warnings: ${this.metrics.warningCount}`,
            '',
            '--- Performance Status ---'
        ];

        // パフォーマンス状態の評価
        const status = this.evaluatePerformanceStatus();
        report.push(`Overall Status: ${status.overall}`);
        report.push(`Processing Performance: ${status.processing}`);
        report.push(`Memory Performance: ${status.memory}`);
        report.push(`UI Performance: ${status.ui}`);

        if (status.recommendations.length > 0) {
            report.push('');
            report.push('--- Recommendations ---');
            status.recommendations.forEach(rec => report.push(`- ${rec}`));
        }

        return report.join('\n');
    }

    /**
     * リソースを解放
     */
    public dispose(): void {
        this.stopMonitoring();
        this.operationTimers.clear();
        this.operationCounts.clear();
        this.metricsHistory.length = 0;
        this.activeAlerts.clear();
        this.alertCallbacks.length = 0;
    }

    // プライベートメソッド

    /**
     * デフォルト設定を取得
     */
    private getDefaultConfig(): PerformanceConfig {
        return {
            monitoringEnabled: true,
            metricsUpdateInterval: 1000,
            performanceLoggingEnabled: false,

            maxExperienceCalculationTime: 100,
            maxLevelUpProcessingTime: 200,
            maxMemoryUsage: 10 * 1024 * 1024, // 10MB
            maxObjectCount: 1000,

            autoOptimizationEnabled: true,
            cacheOptimizationEnabled: true,
            poolOptimizationEnabled: true,
            garbageCollectionEnabled: true,

            performanceAlertsEnabled: true,
            memoryAlertsEnabled: true
        };
    }

    /**
     * 初期メトリクスを取得
     */
    private getInitialMetrics(): PerformanceMetrics {
        return {
            experienceCalculationTime: 0,
            levelUpProcessingTime: 0,
            uiUpdateTime: 0,
            batchProcessingTime: 0,

            memoryUsage: 0,
            objectCount: 0,
            cacheSize: 0,
            poolSize: 0,

            experienceOperationsPerSecond: 0,
            levelUpsPerSecond: 0,
            uiUpdatesPerSecond: 0,

            errorCount: 0,
            warningCount: 0,

            lastUpdated: Date.now()
        };
    }

    /**
     * 監視を初期化
     */
    private initializeMonitoring(): void {
        // ブラウザのパフォーマンス監視を設定
        if (typeof window !== 'undefined' && window.performance) {
            // メモリ使用量の監視（Chrome）
            if ('memory' in window.performance) {
                setInterval(() => {
                    const memory = (window.performance as any).memory;
                    if (memory) {
                        this.metrics.memoryUsage = memory.usedJSHeapSize;
                    }
                }, 5000);
            }
        }
    }

    /**
     * メトリクスを更新
     */
    private updateMetrics(): void {
        const now = Date.now();
        const timeDelta = (now - this.lastMetricsUpdate) / 1000;

        if (timeDelta > 0) {
            // 操作レートを計算
            this.metrics.experienceOperationsPerSecond =
                (this.operationCounts.get('experience') || 0) / timeDelta;
            this.metrics.levelUpsPerSecond =
                (this.operationCounts.get('levelup') || 0) / timeDelta;
            this.metrics.uiUpdatesPerSecond =
                (this.operationCounts.get('ui') || 0) / timeDelta;

            // カウンターをリセット
            this.operationCounts.clear();
        }

        // キャッシュとプールのサイズを更新
        if (this.cacheManager) {
            this.metrics.cacheSize = this.cacheManager.getSize();
        }
        if (this.objectPoolManager) {
            this.metrics.poolSize = this.objectPoolManager.getSize();
        }

        this.metrics.lastUpdated = now;
        this.lastMetricsUpdate = now;

        // 履歴に追加
        this.metricsHistory.push({ ...this.metrics });
        if (this.metricsHistory.length > this.MAX_HISTORY_SIZE) {
            this.metricsHistory.shift();
        }

        if (this.config.performanceLoggingEnabled) {
            console.debug('Performance metrics updated:', this.metrics);
        }
    }

    /**
     * 操作メトリクスを更新
     */
    private updateOperationMetrics(operationName: string, duration: number): void {
        switch (operationName) {
            case 'experience-calculation':
                this.metrics.experienceCalculationTime = duration;
                break;
            case 'levelup-processing':
                this.metrics.levelUpProcessingTime = duration;
                break;
            case 'ui-update':
                this.metrics.uiUpdateTime = duration;
                break;
            case 'batch-processing':
                this.metrics.batchProcessingTime = duration;
                break;
        }
    }

    /**
     * パフォーマンス閾値をチェック
     */
    private checkPerformanceThresholds(): void {
        const alerts: PerformanceAlert[] = [];

        // 処理時間の閾値チェック
        if (this.metrics.experienceCalculationTime > this.config.maxExperienceCalculationTime) {
            alerts.push({
                type: 'performance',
                severity: 'high',
                message: 'Experience calculation time exceeded threshold',
                metrics: { experienceCalculationTime: this.metrics.experienceCalculationTime },
                timestamp: Date.now(),
                suggestions: [
                    'Enable experience calculation caching',
                    'Optimize experience table lookup',
                    'Consider batch processing for multiple characters'
                ]
            });
        }

        if (this.metrics.levelUpProcessingTime > this.config.maxLevelUpProcessingTime) {
            alerts.push({
                type: 'performance',
                severity: 'high',
                message: 'Level up processing time exceeded threshold',
                metrics: { levelUpProcessingTime: this.metrics.levelUpProcessingTime },
                timestamp: Date.now(),
                suggestions: [
                    'Optimize stat growth calculations',
                    'Use object pooling for level up effects',
                    'Defer UI updates until after processing'
                ]
            });
        }

        // メモリ使用量の閾値チェック
        if (this.metrics.memoryUsage > this.config.maxMemoryUsage) {
            alerts.push({
                type: 'memory',
                severity: 'critical',
                message: 'Memory usage exceeded threshold',
                metrics: { memoryUsage: this.metrics.memoryUsage },
                timestamp: Date.now(),
                suggestions: [
                    'Run garbage collection',
                    'Clear unused caches',
                    'Reduce object pool sizes',
                    'Release inactive UI elements'
                ]
            });
        }

        if (this.metrics.objectCount > this.config.maxObjectCount) {
            alerts.push({
                type: 'memory',
                severity: 'medium',
                message: 'Object count exceeded threshold',
                metrics: { objectCount: this.metrics.objectCount },
                timestamp: Date.now(),
                suggestions: [
                    'Implement object pooling',
                    'Clean up unused objects',
                    'Optimize object lifecycle management'
                ]
            });
        }

        // アラートを発行
        alerts.forEach(alert => this.emitAlert(alert));
    }

    /**
     * 自動最適化を実行
     */
    private performAutoOptimization(): void {
        if (!this.config.autoOptimizationEnabled) {
            return;
        }

        // メモリ使用量が閾値の80%を超えた場合
        if (this.metrics.memoryUsage > this.config.maxMemoryUsage * 0.8) {
            this.optimizeMemory();
        }

        // 処理時間が閾値の80%を超えた場合
        if (this.metrics.experienceCalculationTime > this.config.maxExperienceCalculationTime * 0.8) {
            this.optimizeCache();
        }
    }

    /**
     * キャッシュを最適化
     */
    private async optimizeCache(): Promise<OptimizationResult | null> {
        if (!this.cacheManager || !this.config.cacheOptimizationEnabled) {
            return null;
        }

        const beforeMetrics = { cacheSize: this.metrics.cacheSize };

        try {
            await this.cacheManager.optimize();

            const afterMetrics = { cacheSize: this.cacheManager.getSize() };
            const improvement = beforeMetrics.cacheSize - afterMetrics.cacheSize;

            return {
                success: true,
                optimizationType: 'cache',
                beforeMetrics,
                afterMetrics,
                improvement,
                message: `Cache optimized: ${improvement} entries removed`
            };

        } catch (error) {
            console.error('Cache optimization failed:', error);
            return {
                success: false,
                optimizationType: 'cache',
                beforeMetrics,
                afterMetrics: beforeMetrics,
                improvement: 0,
                message: `Cache optimization failed: ${error}`
            };
        }
    }

    /**
     * オブジェクトプールを最適化
     */
    private async optimizeObjectPool(): Promise<OptimizationResult | null> {
        if (!this.objectPoolManager || !this.config.poolOptimizationEnabled) {
            return null;
        }

        const beforeMetrics = { poolSize: this.metrics.poolSize };

        try {
            await this.objectPoolManager.optimize();

            const afterMetrics = { poolSize: this.objectPoolManager.getSize() };
            const improvement = beforeMetrics.poolSize - afterMetrics.poolSize;

            return {
                success: true,
                optimizationType: 'pool',
                beforeMetrics,
                afterMetrics,
                improvement,
                message: `Object pool optimized: ${improvement} objects released`
            };

        } catch (error) {
            console.error('Object pool optimization failed:', error);
            return {
                success: false,
                optimizationType: 'pool',
                beforeMetrics,
                afterMetrics: beforeMetrics,
                improvement: 0,
                message: `Object pool optimization failed: ${error}`
            };
        }
    }

    /**
     * メモリを最適化
     */
    private async optimizeMemory(): Promise<OptimizationResult | null> {
        if (!this.config.garbageCollectionEnabled) {
            return null;
        }

        const beforeMetrics = {
            memoryUsage: this.metrics.memoryUsage,
            objectCount: this.metrics.objectCount
        };

        try {
            // ガベージコレクションを実行（可能な場合）
            if (typeof window !== 'undefined' && (window as any).gc) {
                (window as any).gc();
            }

            // 少し待ってメトリクスを更新
            await new Promise(resolve => setTimeout(resolve, 100));

            const afterMetrics = {
                memoryUsage: this.metrics.memoryUsage,
                objectCount: this.metrics.objectCount
            };

            const improvement = beforeMetrics.memoryUsage - afterMetrics.memoryUsage;

            return {
                success: true,
                optimizationType: 'memory',
                beforeMetrics,
                afterMetrics,
                improvement,
                message: `Memory optimized: ${(improvement / 1024 / 1024).toFixed(2)}MB freed`
            };

        } catch (error) {
            console.error('Memory optimization failed:', error);
            return {
                success: false,
                optimizationType: 'memory',
                beforeMetrics,
                afterMetrics: beforeMetrics,
                improvement: 0,
                message: `Memory optimization failed: ${error}`
            };
        }
    }

    /**
     * バッチ処理を最適化
     */
    private async optimizeBatchProcessing(): Promise<OptimizationResult | null> {
        if (!this.batchProcessor) {
            return null;
        }

        const beforeMetrics = { batchProcessingTime: this.metrics.batchProcessingTime };

        try {
            await this.batchProcessor.optimize();

            const afterMetrics = { batchProcessingTime: this.metrics.batchProcessingTime };
            const improvement = beforeMetrics.batchProcessingTime - afterMetrics.batchProcessingTime;

            return {
                success: true,
                optimizationType: 'batch',
                beforeMetrics,
                afterMetrics,
                improvement,
                message: `Batch processing optimized: ${improvement.toFixed(2)}ms improvement`
            };

        } catch (error) {
            console.error('Batch processing optimization failed:', error);
            return {
                success: false,
                optimizationType: 'batch',
                beforeMetrics,
                afterMetrics: beforeMetrics,
                improvement: 0,
                message: `Batch processing optimization failed: ${error}`
            };
        }
    }

    /**
     * パフォーマンス状態を評価
     */
    private evaluatePerformanceStatus(): {
        overall: string;
        processing: string;
        memory: string;
        ui: string;
        recommendations: string[];
    } {
        const recommendations: string[] = [];

        // 処理パフォーマンスの評価
        let processingStatus = 'Good';
        if (this.metrics.experienceCalculationTime > this.config.maxExperienceCalculationTime * 0.8) {
            processingStatus = 'Warning';
            recommendations.push('Consider optimizing experience calculations');
        }
        if (this.metrics.experienceCalculationTime > this.config.maxExperienceCalculationTime) {
            processingStatus = 'Critical';
        }

        // メモリパフォーマンスの評価
        let memoryStatus = 'Good';
        if (this.metrics.memoryUsage > this.config.maxMemoryUsage * 0.8) {
            memoryStatus = 'Warning';
            recommendations.push('Monitor memory usage closely');
        }
        if (this.metrics.memoryUsage > this.config.maxMemoryUsage) {
            memoryStatus = 'Critical';
            recommendations.push('Immediate memory optimization required');
        }

        // UIパフォーマンスの評価
        let uiStatus = 'Good';
        if (this.metrics.uiUpdateTime > 50) {
            uiStatus = 'Warning';
            recommendations.push('Optimize UI update performance');
        }
        if (this.metrics.uiUpdateTime > 100) {
            uiStatus = 'Critical';
        }

        // 全体評価
        const statuses = [processingStatus, memoryStatus, uiStatus];
        let overallStatus = 'Good';
        if (statuses.includes('Critical')) {
            overallStatus = 'Critical';
        } else if (statuses.includes('Warning')) {
            overallStatus = 'Warning';
        }

        return {
            overall: overallStatus,
            processing: processingStatus,
            memory: memoryStatus,
            ui: uiStatus,
            recommendations
        };
    }

    /**
     * アラートを発行
     */
    private emitAlert(alert: PerformanceAlert): void {
        const alertKey = `${alert.type}-${alert.message}`;

        // 重複アラートを防ぐ
        if (this.activeAlerts.has(alertKey)) {
            return;
        }

        this.activeAlerts.add(alertKey);

        // 一定時間後にアラートをクリア
        setTimeout(() => {
            this.activeAlerts.delete(alertKey);
        }, 60000); // 1分

        // アラートコールバックを実行
        this.alertCallbacks.forEach(callback => {
            try {
                callback(alert);
            } catch (error) {
                console.error('Alert callback failed:', error);
            }
        });

        if (this.config.performanceAlertsEnabled || this.config.memoryAlertsEnabled) {
            console.warn(`Performance Alert [${alert.severity}]: ${alert.message}`, alert);
        }
    }
}