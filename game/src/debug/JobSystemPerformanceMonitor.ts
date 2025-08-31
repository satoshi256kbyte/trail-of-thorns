/**
 * JobSystemPerformanceMonitor - 職業システムパフォーマンス監視ツール
 * 
 * このクラスは職業システムのパフォーマンス監視、メトリクス収集、
 * 最適化提案を提供します。
 */

import { JobSystem } from '../systems/jobs/JobSystem';

/**
 * パフォーマンスメトリクス
 */
export interface PerformanceMetrics {
    // 実行時間メトリクス
    timing: {
        jobChange: {
            average: number;
            min: number;
            max: number;
            samples: number;
        };
        rankUp: {
            average: number;
            min: number;
            max: number;
            samples: number;
        };
        statCalculation: {
            average: number;
            min: number;
            max: number;
            samples: number;
        };
        skillCalculation: {
            average: number;
            min: number;
            max: number;
            samples: number;
        };
    };

    // メモリメトリクス
    memory: {
        heapUsed: number;
        heapTotal: number;
        external: number;
        arrayBuffers: number;
        peakUsage: number;
        leakDetected: boolean;
    };

    // キャッシュメトリクス
    cache: {
        hitRate: number;
        missRate: number;
        size: number;
        evictions: number;
    };

    // システムメトリクス
    system: {
        operationsPerSecond: number;
        errorRate: number;
        uptime: number;
        lastOptimization: number;
    };
}

/**
 * パフォーマンス警告
 */
export interface PerformanceWarning {
    type: 'timing' | 'memory' | 'cache' | 'system';
    severity: 'low' | 'medium' | 'high' | 'critical';
    message: string;
    metric: string;
    value: number;
    threshold: number;
    recommendation: string;
    timestamp: number;
}

/**
 * パフォーマンス設定
 */
export interface PerformanceConfig {
    // 監視設定
    monitoring: {
        enabled: boolean;
        interval: number; // ms
        sampleSize: number;
        enableMemoryTracking: boolean;
        enableTimingTracking: boolean;
    };

    // 警告閾値
    thresholds: {
        jobChangeTime: number; // ms
        rankUpTime: number; // ms
        memoryUsage: number; // bytes
        cacheHitRate: number; // 0-1
        errorRate: number; // 0-1
    };

    // 最適化設定
    optimization: {
        autoOptimize: boolean;
        optimizationInterval: number; // ms
        enableGarbageCollection: boolean;
        enableCacheOptimization: boolean;
    };
}

/**
 * 職業システムパフォーマンス監視ツール
 */
export class JobSystemPerformanceMonitor {
    private jobSystem: JobSystem;
    private config: PerformanceConfig;
    private metrics: PerformanceMetrics;
    private warnings: PerformanceWarning[] = [];
    private timingSamples: Map<string, number[]> = new Map();
    private monitoringInterval: NodeJS.Timeout | null = null;
    private optimizationInterval: NodeJS.Timeout | null = null;
    private startTime: number;

    private static readonly DEFAULT_CONFIG: PerformanceConfig = {
        monitoring: {
            enabled: true,
            interval: 1000, // 1秒
            sampleSize: 100,
            enableMemoryTracking: true,
            enableTimingTracking: true,
        },
        thresholds: {
            jobChangeTime: 1000, // 1秒
            rankUpTime: 2000, // 2秒
            memoryUsage: 100 * 1024 * 1024, // 100MB
            cacheHitRate: 0.8, // 80%
            errorRate: 0.05, // 5%
        },
        optimization: {
            autoOptimize: false,
            optimizationInterval: 30000, // 30秒
            enableGarbageCollection: true,
            enableCacheOptimization: true,
        },
    };

    constructor(jobSystem: JobSystem, config?: Partial<PerformanceConfig>) {
        this.jobSystem = jobSystem;
        this.config = { ...JobSystemPerformanceMonitor.DEFAULT_CONFIG, ...config };
        this.startTime = Date.now();

        this.initializeMetrics();
        this.setupEventListeners();
        this.setupConsoleCommands();

        if (this.config.monitoring.enabled) {
            this.startMonitoring();
        }

        if (this.config.optimization.autoOptimize) {
            this.startAutoOptimization();
        }
    }

    /**
     * メトリクスを初期化
     */
    private initializeMetrics(): void {
        this.metrics = {
            timing: {
                jobChange: { average: 0, min: Infinity, max: 0, samples: 0 },
                rankUp: { average: 0, min: Infinity, max: 0, samples: 0 },
                statCalculation: { average: 0, min: Infinity, max: 0, samples: 0 },
                skillCalculation: { average: 0, min: Infinity, max: 0, samples: 0 },
            },
            memory: {
                heapUsed: 0,
                heapTotal: 0,
                external: 0,
                arrayBuffers: 0,
                peakUsage: 0,
                leakDetected: false,
            },
            cache: {
                hitRate: 0,
                missRate: 0,
                size: 0,
                evictions: 0,
            },
            system: {
                operationsPerSecond: 0,
                errorRate: 0,
                uptime: 0,
                lastOptimization: Date.now(),
            },
        };
    }

    /**
     * イベントリスナーを設定
     */
    private setupEventListeners(): void {
        // 職業変更イベント
        this.jobSystem.on('job_change_start', (data) => {
            this.startTiming('jobChange', data.characterId);
        });

        this.jobSystem.on('job_change_complete', (data) => {
            this.endTiming('jobChange', data.characterId);
        });

        // ランクアップイベント
        this.jobSystem.on('rank_up_start', (data) => {
            this.startTiming('rankUp', data.characterId);
        });

        this.jobSystem.on('rank_up_complete', (data) => {
            this.endTiming('rankUp', data.characterId);
        });

        // 能力値計算イベント
        this.jobSystem.on('stat_calculation_start', (data) => {
            this.startTiming('statCalculation', data.characterId);
        });

        this.jobSystem.on('stat_calculation_complete', (data) => {
            this.endTiming('statCalculation', data.characterId);
        });

        // スキル計算イベント
        this.jobSystem.on('skill_calculation_start', (data) => {
            this.startTiming('skillCalculation', data.characterId);
        });

        this.jobSystem.on('skill_calculation_complete', (data) => {
            this.endTiming('skillCalculation', data.characterId);
        });

        // エラーイベント
        this.jobSystem.on('system_error', (data) => {
            this.recordError(data);
        });
    }

    /**
     * コンソールコマンドを設定
     */
    private setupConsoleCommands(): void {
        if (typeof window !== 'undefined') {
            (window as any).jobPerf = {
                // 監視制御
                start: () => this.startMonitoring(),
                stop: () => this.stopMonitoring(),
                reset: () => this.resetMetrics(),

                // メトリクス表示
                metrics: () => this.getMetrics(),
                timing: () => this.getTimingMetrics(),
                memory: () => this.getMemoryMetrics(),
                cache: () => this.getCacheMetrics(),

                // 警告管理
                warnings: () => this.getWarnings(),
                clearWarnings: () => this.clearWarnings(),

                // 最適化
                optimize: () => this.runOptimization(),
                autoOptimize: (enabled: boolean) => this.setAutoOptimization(enabled),

                // レポート
                report: () => this.generateReport(),
                benchmark: () => this.runBenchmark(),

                // 設定
                config: (newConfig?: Partial<PerformanceConfig>) => {
                    if (newConfig) {
                        this.updateConfig(newConfig);
                        return 'Config updated';
                    }
                    return this.config;
                },

                // ヘルプ
                help: () => this.showHelp(),
            };

            console.log('Job System Performance Monitor loaded. Type jobPerf.help() for commands.');
        }
    }

    /**
     * 監視を開始
     */
    startMonitoring(): void {
        if (this.monitoringInterval) {
            return;
        }

        this.monitoringInterval = setInterval(() => {
            this.collectMetrics();
            this.checkThresholds();
        }, this.config.monitoring.interval);

        console.log('Performance monitoring started');
    }

    /**
     * 監視を停止
     */
    stopMonitoring(): void {
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.monitoringInterval = null;
        }

        console.log('Performance monitoring stopped');
    }

    /**
     * 自動最適化を開始
     */
    private startAutoOptimization(): void {
        if (this.optimizationInterval) {
            return;
        }

        this.optimizationInterval = setInterval(() => {
            this.runOptimization();
        }, this.config.optimization.optimizationInterval);

        console.log('Auto optimization started');
    }

    /**
     * 自動最適化を停止
     */
    private stopAutoOptimization(): void {
        if (this.optimizationInterval) {
            clearInterval(this.optimizationInterval);
            this.optimizationInterval = null;
        }

        console.log('Auto optimization stopped');
    }

    /**
     * タイミング測定を開始
     */
    private startTiming(operation: string, identifier: string): void {
        if (!this.config.monitoring.enableTimingTracking) {
            return;
        }

        const key = `${operation}_${identifier}`;
        const startTime = performance.now();

        // 開始時間を記録
        if (!this.timingSamples.has(key)) {
            this.timingSamples.set(key, []);
        }

        // 一時的に開始時間を保存
        (this as any)[`_timing_${key}`] = startTime;
    }

    /**
     * タイミング測定を終了
     */
    private endTiming(operation: string, identifier: string): void {
        if (!this.config.monitoring.enableTimingTracking) {
            return;
        }

        const key = `${operation}_${identifier}`;
        const startTime = (this as any)[`_timing_${key}`];

        if (startTime === undefined) {
            return;
        }

        const endTime = performance.now();
        const duration = endTime - startTime;

        // サンプルを記録
        this.recordTimingSample(operation, duration);

        // 一時データを削除
        delete (this as any)[`_timing_${key}`];
    }

    /**
     * タイミングサンプルを記録
     */
    private recordTimingSample(operation: string, duration: number): void {
        const metric = (this.metrics.timing as any)[operation];
        if (!metric) {
            return;
        }

        // 統計を更新
        metric.samples++;
        metric.min = Math.min(metric.min, duration);
        metric.max = Math.max(metric.max, duration);

        // 移動平均を計算
        const alpha = 0.1;
        metric.average = metric.average * (1 - alpha) + duration * alpha;

        // サンプルサイズを制限
        const samples = this.timingSamples.get(operation) || [];
        samples.push(duration);

        if (samples.length > this.config.monitoring.sampleSize) {
            samples.shift();
        }

        this.timingSamples.set(operation, samples);
    }

    /**
     * メトリクスを収集
     */
    private collectMetrics(): void {
        // メモリメトリクスを収集
        if (this.config.monitoring.enableMemoryTracking) {
            this.collectMemoryMetrics();
        }

        // キャッシュメトリクスを収集
        this.collectCacheMetrics();

        // システムメトリクスを収集
        this.collectSystemMetrics();
    }

    /**
     * メモリメトリクスを収集
     */
    private collectMemoryMetrics(): void {
        if (typeof performance !== 'undefined' && performance.memory) {
            const memory = performance.memory;

            this.metrics.memory.heapUsed = memory.usedJSHeapSize;
            this.metrics.memory.heapTotal = memory.totalJSHeapSize;
            this.metrics.memory.external = 0; // Node.js specific
            this.metrics.memory.arrayBuffers = 0; // Node.js specific
            this.metrics.memory.peakUsage = Math.max(
                this.metrics.memory.peakUsage,
                memory.usedJSHeapSize
            );

            // メモリリーク検出（簡易版）
            const growthRate = this.metrics.memory.heapUsed / this.metrics.memory.heapTotal;
            this.metrics.memory.leakDetected = growthRate > 0.9;
        }
    }

    /**
     * キャッシュメトリクスを収集
     */
    private collectCacheMetrics(): void {
        try {
            // JobSystemからキャッシュ統計を取得
            const cacheStats = this.jobSystem.getCacheStatistics?.();

            if (cacheStats) {
                this.metrics.cache.hitRate = cacheStats.hitRate || 0;
                this.metrics.cache.missRate = 1 - this.metrics.cache.hitRate;
                this.metrics.cache.size = cacheStats.size || 0;
                this.metrics.cache.evictions = cacheStats.evictions || 0;
            }
        } catch (error) {
            // キャッシュ統計が利用できない場合は無視
        }
    }

    /**
     * システムメトリクスを収集
     */
    private collectSystemMetrics(): void {
        this.metrics.system.uptime = Date.now() - this.startTime;

        // 操作数/秒を計算（簡易版）
        const totalOperations = Object.values(this.metrics.timing)
            .reduce((sum, metric) => sum + metric.samples, 0);
        const uptimeSeconds = this.metrics.system.uptime / 1000;
        this.metrics.system.operationsPerSecond = totalOperations / Math.max(uptimeSeconds, 1);
    }

    /**
     * エラーを記録
     */
    private recordError(errorData: any): void {
        // エラー率を更新（簡易版）
        const alpha = 0.1;
        this.metrics.system.errorRate = this.metrics.system.errorRate * (1 - alpha) + alpha;
    }

    /**
     * 閾値をチェック
     */
    private checkThresholds(): void {
        const thresholds = this.config.thresholds;

        // タイミング閾値チェック
        if (this.metrics.timing.jobChange.average > thresholds.jobChangeTime) {
            this.addWarning({
                type: 'timing',
                severity: 'high',
                message: 'Job change time exceeds threshold',
                metric: 'jobChange.average',
                value: this.metrics.timing.jobChange.average,
                threshold: thresholds.jobChangeTime,
                recommendation: 'Consider optimizing job change logic or caching',
                timestamp: Date.now(),
            });
        }

        if (this.metrics.timing.rankUp.average > thresholds.rankUpTime) {
            this.addWarning({
                type: 'timing',
                severity: 'high',
                message: 'Rank up time exceeds threshold',
                metric: 'rankUp.average',
                value: this.metrics.timing.rankUp.average,
                threshold: thresholds.rankUpTime,
                recommendation: 'Consider optimizing rank up calculations',
                timestamp: Date.now(),
            });
        }

        // メモリ閾値チェック
        if (this.metrics.memory.heapUsed > thresholds.memoryUsage) {
            this.addWarning({
                type: 'memory',
                severity: 'medium',
                message: 'Memory usage exceeds threshold',
                metric: 'memory.heapUsed',
                value: this.metrics.memory.heapUsed,
                threshold: thresholds.memoryUsage,
                recommendation: 'Consider running garbage collection or optimizing memory usage',
                timestamp: Date.now(),
            });
        }

        if (this.metrics.memory.leakDetected) {
            this.addWarning({
                type: 'memory',
                severity: 'critical',
                message: 'Potential memory leak detected',
                metric: 'memory.leakDetected',
                value: 1,
                threshold: 0,
                recommendation: 'Investigate memory usage patterns and fix potential leaks',
                timestamp: Date.now(),
            });
        }

        // キャッシュ閾値チェック
        if (this.metrics.cache.hitRate < thresholds.cacheHitRate) {
            this.addWarning({
                type: 'cache',
                severity: 'medium',
                message: 'Cache hit rate below threshold',
                metric: 'cache.hitRate',
                value: this.metrics.cache.hitRate,
                threshold: thresholds.cacheHitRate,
                recommendation: 'Consider adjusting cache size or preloading common data',
                timestamp: Date.now(),
            });
        }

        // エラー率閾値チェック
        if (this.metrics.system.errorRate > thresholds.errorRate) {
            this.addWarning({
                type: 'system',
                severity: 'high',
                message: 'Error rate exceeds threshold',
                metric: 'system.errorRate',
                value: this.metrics.system.errorRate,
                threshold: thresholds.errorRate,
                recommendation: 'Investigate and fix recurring errors',
                timestamp: Date.now(),
            });
        }
    }

    /**
     * 警告を追加
     */
    private addWarning(warning: PerformanceWarning): void {
        // 重複警告を避ける
        const existingWarning = this.warnings.find(w =>
            w.type === warning.type &&
            w.metric === warning.metric &&
            Date.now() - w.timestamp < 60000 // 1分以内の重複を避ける
        );

        if (!existingWarning) {
            this.warnings.push(warning);

            // 警告数を制限
            if (this.warnings.length > 100) {
                this.warnings.shift();
            }

            // 重要な警告はコンソールに出力
            if (warning.severity === 'high' || warning.severity === 'critical') {
                console.warn(`[JobSystem Performance] ${warning.message}`, warning);
            }
        }
    }

    /**
     * 最適化を実行
     */
    runOptimization(): void {
        console.log('Running performance optimization...');

        let optimizationsApplied = 0;

        // ガベージコレクション
        if (this.config.optimization.enableGarbageCollection) {
            if (typeof global !== 'undefined' && global.gc) {
                global.gc();
                optimizationsApplied++;
            }
        }

        // キャッシュ最適化
        if (this.config.optimization.enableCacheOptimization) {
            try {
                this.jobSystem.optimizeCache?.();
                optimizationsApplied++;
            } catch (error) {
                // キャッシュ最適化が利用できない場合は無視
            }
        }

        this.metrics.system.lastOptimization = Date.now();
        console.log(`Performance optimization completed. ${optimizationsApplied} optimizations applied.`);
    }

    /**
     * ベンチマークを実行
     */
    runBenchmark(): any {
        console.log('Running performance benchmark...');

        const benchmark = {
            timestamp: Date.now(),
            results: {} as any,
        };

        // 職業変更ベンチマーク
        benchmark.results.jobChange = this.benchmarkJobChange();

        // ランクアップベンチマーク
        benchmark.results.rankUp = this.benchmarkRankUp();

        // 能力値計算ベンチマーク
        benchmark.results.statCalculation = this.benchmarkStatCalculation();

        console.log('Benchmark completed:', benchmark);
        return benchmark;
    }

    /**
     * 職業変更ベンチマーク
     */
    private benchmarkJobChange(): any {
        const iterations = 100;
        const times: number[] = [];

        for (let i = 0; i < iterations; i++) {
            const startTime = performance.now();

            try {
                // 仮想的な職業変更を実行
                this.jobSystem.changeJob(`benchmark_char_${i}`, 'warrior');
            } catch (error) {
                // エラーは無視（テスト用キャラクターが存在しない等）
            }

            const endTime = performance.now();
            times.push(endTime - startTime);
        }

        return {
            iterations,
            average: times.reduce((sum, time) => sum + time, 0) / times.length,
            min: Math.min(...times),
            max: Math.max(...times),
            median: times.sort((a, b) => a - b)[Math.floor(times.length / 2)],
        };
    }

    /**
     * ランクアップベンチマーク
     */
    private benchmarkRankUp(): any {
        const iterations = 50;
        const times: number[] = [];

        for (let i = 0; i < iterations; i++) {
            const startTime = performance.now();

            try {
                // 仮想的なランクアップを実行
                this.jobSystem.rankUpJob(`benchmark_char_${i}`, 2);
            } catch (error) {
                // エラーは無視
            }

            const endTime = performance.now();
            times.push(endTime - startTime);
        }

        return {
            iterations,
            average: times.reduce((sum, time) => sum + time, 0) / times.length,
            min: Math.min(...times),
            max: Math.max(...times),
            median: times.sort((a, b) => a - b)[Math.floor(times.length / 2)],
        };
    }

    /**
     * 能力値計算ベンチマーク
     */
    private benchmarkStatCalculation(): any {
        const iterations = 1000;
        const times: number[] = [];

        for (let i = 0; i < iterations; i++) {
            const startTime = performance.now();

            try {
                // 仮想的な能力値計算を実行
                this.jobSystem.getCharacterJobStats(`benchmark_char_${i}`);
            } catch (error) {
                // エラーは無視
            }

            const endTime = performance.now();
            times.push(endTime - startTime);
        }

        return {
            iterations,
            average: times.reduce((sum, time) => sum + time, 0) / times.length,
            min: Math.min(...times),
            max: Math.max(...times),
            median: times.sort((a, b) => a - b)[Math.floor(times.length / 2)],
        };
    }

    /**
     * メトリクスを取得
     */
    getMetrics(): PerformanceMetrics {
        return { ...this.metrics };
    }

    /**
     * タイミングメトリクスを取得
     */
    getTimingMetrics(): any {
        return { ...this.metrics.timing };
    }

    /**
     * メモリメトリクスを取得
     */
    getMemoryMetrics(): any {
        return { ...this.metrics.memory };
    }

    /**
     * キャッシュメトリクスを取得
     */
    getCacheMetrics(): any {
        return { ...this.metrics.cache };
    }

    /**
     * 警告を取得
     */
    getWarnings(): PerformanceWarning[] {
        return [...this.warnings];
    }

    /**
     * 警告をクリア
     */
    clearWarnings(): void {
        this.warnings = [];
        console.log('Performance warnings cleared');
    }

    /**
     * メトリクスをリセット
     */
    resetMetrics(): void {
        this.initializeMetrics();
        this.timingSamples.clear();
        this.warnings = [];
        this.startTime = Date.now();
        console.log('Performance metrics reset');
    }

    /**
     * 自動最適化を設定
     */
    setAutoOptimization(enabled: boolean): void {
        this.config.optimization.autoOptimize = enabled;

        if (enabled) {
            this.startAutoOptimization();
        } else {
            this.stopAutoOptimization();
        }

        console.log(`Auto optimization ${enabled ? 'enabled' : 'disabled'}`);
    }

    /**
     * 設定を更新
     */
    updateConfig(newConfig: Partial<PerformanceConfig>): void {
        this.config = this.deepMerge(this.config, newConfig);
        console.log('Performance monitor config updated:', this.config);
    }

    /**
     * レポートを生成
     */
    generateReport(): string {
        const report = {
            timestamp: new Date().toISOString(),
            uptime: this.metrics.system.uptime,
            metrics: this.metrics,
            warnings: this.warnings,
            config: this.config,
            summary: {
                totalWarnings: this.warnings.length,
                criticalWarnings: this.warnings.filter(w => w.severity === 'critical').length,
                averageJobChangeTime: this.metrics.timing.jobChange.average,
                memoryUsage: this.metrics.memory.heapUsed,
                cacheHitRate: this.metrics.cache.hitRate,
            },
        };

        const reportText = JSON.stringify(report, null, 2);
        console.log('Performance report generated');
        return reportText;
    }

    /**
     * オブジェクトを深くマージ
     */
    private deepMerge(target: any, source: any): any {
        const result = { ...target };

        for (const key in source) {
            if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                result[key] = this.deepMerge(result[key] || {}, source[key]);
            } else {
                result[key] = source[key];
            }
        }

        return result;
    }

    /**
     * ヘルプを表示
     */
    private showHelp(): void {
        const commands = [
            '=== Job System Performance Monitor Commands ===',
            '',
            'Monitoring Control:',
            '  start()                   - Start performance monitoring',
            '  stop()                    - Stop performance monitoring',
            '  reset()                   - Reset all metrics',
            '',
            'Metrics:',
            '  metrics()                 - Get all performance metrics',
            '  timing()                  - Get timing metrics',
            '  memory()                  - Get memory metrics',
            '  cache()                   - Get cache metrics',
            '',
            'Warnings:',
            '  warnings()                - Get performance warnings',
            '  clearWarnings()           - Clear all warnings',
            '',
            'Optimization:',
            '  optimize()                - Run manual optimization',
            '  autoOptimize(enabled)     - Enable/disable auto optimization',
            '',
            'Analysis:',
            '  report()                  - Generate performance report',
            '  benchmark()               - Run performance benchmark',
            '',
            'Configuration:',
            '  config()                  - Get current configuration',
            '  config(newConfig)         - Update configuration',
            '',
            'Usage Examples:',
            '  jobPerf.start()',
            '  jobPerf.metrics()',
            '  jobPerf.benchmark()',
            '  jobPerf.autoOptimize(true)',
        ];

        console.log(commands.join('\n'));
    }

    /**
     * リソースを破棄
     */
    destroy(): void {
        this.stopMonitoring();
        this.stopAutoOptimization();

        // グローバルコマンドを削除
        if (typeof window !== 'undefined') {
            delete (window as any).jobPerf;
        }

        console.log('JobSystemPerformanceMonitor destroyed');
    }
}