/**
 * JobMemoryMonitor - 職業システムのメモリ監視と管理
 * 
 * このクラスはメモリリーク防止、メモリ使用量の監視、
 * ガベージコレクションの最適化を行います。
 * 要件8.3, 8.5に対応した機能を提供します。
 */

import { JobSystemError } from '../../types/job';

/**
 * メモリ使用量情報
 */
export interface MemoryUsageInfo {
    usedJSHeapSize: number;
    totalJSHeapSize: number;
    jsHeapSizeLimit: number;
    usagePercentage: number;
    trend: 'increasing' | 'decreasing' | 'stable';
}

/**
 * メモリリーク検出情報
 */
export interface MemoryLeakInfo {
    detected: boolean;
    leakType: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    suggestedAction: string;
    timestamp: number;
}

/**
 * メモリ監視設定
 */
export interface MemoryMonitorConfig {
    monitoringInterval: number;
    warningThreshold: number;
    criticalThreshold: number;
    enableLeakDetection: boolean;
    enableAutoCleanup: boolean;
    maxHistorySize: number;
}

/**
 * メモリ履歴エントリ
 */
interface MemoryHistoryEntry {
    timestamp: number;
    usedMemory: number;
    totalMemory: number;
    activeObjects: number;
    gcCount: number;
}

/**
 * オブジェクト参照追跡
 */
interface ObjectReference {
    id: string;
    type: string;
    createdAt: number;
    lastAccessed: number;
    referenceCount: number;
    size: number;
}

/**
 * 職業システムメモリ監視クラス
 */
export class JobMemoryMonitor {
    private config: MemoryMonitorConfig;
    private memoryHistory: MemoryHistoryEntry[] = [];
    private objectReferences: Map<string, ObjectReference> = new Map();
    private monitoringTimer: NodeJS.Timeout | null = null;
    private leakDetectionTimer: NodeJS.Timeout | null = null;
    private warningCallbacks: ((info: MemoryUsageInfo) => void)[] = [];
    private leakCallbacks: ((leak: MemoryLeakInfo) => void)[] = [];
    private isMonitoring: boolean = false;
    private gcCount: number = 0;

    constructor(config: Partial<MemoryMonitorConfig> = {}) {
        this.config = {
            monitoringInterval: 5000, // 5秒
            warningThreshold: 0.8, // 80%
            criticalThreshold: 0.95, // 95%
            enableLeakDetection: true,
            enableAutoCleanup: true,
            maxHistorySize: 100,
            ...config
        };

        this.setupGCMonitoring();
    }

    /**
     * ガベージコレクション監視を設定
     */
    private setupGCMonitoring(): void {
        // Node.js環境でのGC監視
        if (typeof global !== 'undefined' && global.gc) {
            const originalGC = global.gc;
            global.gc = () => {
                this.gcCount++;
                return originalGC();
            };
        }
    }

    /**
     * メモリ監視を開始
     * 要件8.3: メモリ使用量の適切な管理
     */
    startMonitoring(): void {
        if (this.isMonitoring) {
            return;
        }

        this.isMonitoring = true;

        // メモリ使用量監視
        this.monitoringTimer = setInterval(() => {
            this.collectMemoryMetrics();
            this.analyzeMemoryTrend();
            this.checkMemoryThresholds();
        }, this.config.monitoringInterval);

        // メモリリーク検出
        if (this.config.enableLeakDetection) {
            this.leakDetectionTimer = setInterval(() => {
                this.detectMemoryLeaks();
            }, this.config.monitoringInterval * 2);
        }

        console.log('JobMemoryMonitor started');
    }

    /**
     * メモリ監視を停止
     */
    stopMonitoring(): void {
        if (!this.isMonitoring) {
            return;
        }

        this.isMonitoring = false;

        if (this.monitoringTimer) {
            clearInterval(this.monitoringTimer);
            this.monitoringTimer = null;
        }

        if (this.leakDetectionTimer) {
            clearInterval(this.leakDetectionTimer);
            this.leakDetectionTimer = null;
        }

        console.log('JobMemoryMonitor stopped');
    }

    /**
     * メモリメトリクスを収集
     */
    private collectMemoryMetrics(): void {
        const memoryInfo = this.getCurrentMemoryUsage();

        const entry: MemoryHistoryEntry = {
            timestamp: Date.now(),
            usedMemory: memoryInfo.usedJSHeapSize,
            totalMemory: memoryInfo.totalJSHeapSize,
            activeObjects: this.objectReferences.size,
            gcCount: this.gcCount
        };

        this.memoryHistory.push(entry);

        // 履歴サイズ制限
        if (this.memoryHistory.length > this.config.maxHistorySize) {
            this.memoryHistory.shift();
        }
    }

    /**
     * 現在のメモリ使用量を取得
     */
    getCurrentMemoryUsage(): MemoryUsageInfo {
        let memoryInfo: MemoryUsageInfo;

        if (typeof performance !== 'undefined' && performance.memory) {
            // ブラウザ環境
            const memory = performance.memory;
            memoryInfo = {
                usedJSHeapSize: memory.usedJSHeapSize,
                totalJSHeapSize: memory.totalJSHeapSize,
                jsHeapSizeLimit: memory.jsHeapSizeLimit,
                usagePercentage: memory.usedJSHeapSize / memory.jsHeapSizeLimit,
                trend: 'stable'
            };
        } else if (typeof process !== 'undefined' && process.memoryUsage) {
            // Node.js環境
            const memory = process.memoryUsage();
            memoryInfo = {
                usedJSHeapSize: memory.heapUsed,
                totalJSHeapSize: memory.heapTotal,
                jsHeapSizeLimit: memory.heapTotal * 2, // 推定値
                usagePercentage: memory.heapUsed / (memory.heapTotal * 2),
                trend: 'stable'
            };
        } else {
            // フォールバック
            memoryInfo = {
                usedJSHeapSize: 0,
                totalJSHeapSize: 0,
                jsHeapSizeLimit: 0,
                usagePercentage: 0,
                trend: 'stable'
            };
        }

        return memoryInfo;
    }

    /**
     * メモリ使用量のトレンドを分析
     */
    private analyzeMemoryTrend(): void {
        if (this.memoryHistory.length < 3) {
            return;
        }

        const recent = this.memoryHistory.slice(-3);
        const trend = this.calculateTrend(recent.map(entry => entry.usedMemory));

        // 最新のエントリにトレンド情報を追加
        const currentInfo = this.getCurrentMemoryUsage();
        currentInfo.trend = trend;
    }

    /**
     * トレンドを計算
     */
    private calculateTrend(values: number[]): 'increasing' | 'decreasing' | 'stable' {
        if (values.length < 2) return 'stable';

        const changes = [];
        for (let i = 1; i < values.length; i++) {
            changes.push(values[i] - values[i - 1]);
        }

        const avgChange = changes.reduce((sum, change) => sum + change, 0) / changes.length;
        const threshold = values[0] * 0.05; // 5%の変化を閾値とする

        if (avgChange > threshold) return 'increasing';
        if (avgChange < -threshold) return 'decreasing';
        return 'stable';
    }

    /**
     * メモリ閾値をチェック
     * 要件8.3: メモリ使用量の適切な管理
     */
    private checkMemoryThresholds(): void {
        const memoryInfo = this.getCurrentMemoryUsage();

        if (memoryInfo.usagePercentage >= this.config.criticalThreshold) {
            this.handleCriticalMemoryUsage(memoryInfo);
        } else if (memoryInfo.usagePercentage >= this.config.warningThreshold) {
            this.handleWarningMemoryUsage(memoryInfo);
        }
    }

    /**
     * 警告レベルのメモリ使用量を処理
     */
    private handleWarningMemoryUsage(memoryInfo: MemoryUsageInfo): void {
        console.warn(`Memory usage warning: ${(memoryInfo.usagePercentage * 100).toFixed(1)}%`);

        this.warningCallbacks.forEach(callback => {
            try {
                callback(memoryInfo);
            } catch (error) {
                console.error('Error in memory warning callback:', error);
            }
        });

        if (this.config.enableAutoCleanup) {
            this.performLightweightCleanup();
        }
    }

    /**
     * 危険レベルのメモリ使用量を処理
     */
    private handleCriticalMemoryUsage(memoryInfo: MemoryUsageInfo): void {
        console.error(`Critical memory usage: ${(memoryInfo.usagePercentage * 100).toFixed(1)}%`);

        this.warningCallbacks.forEach(callback => {
            try {
                callback(memoryInfo);
            } catch (error) {
                console.error('Error in memory warning callback:', error);
            }
        });

        if (this.config.enableAutoCleanup) {
            this.performAggressiveCleanup();
        }
    }

    /**
     * 軽量なクリーンアップを実行
     */
    private performLightweightCleanup(): void {
        // 古いオブジェクト参照を削除
        const now = Date.now();
        const expiredRefs: string[] = [];

        this.objectReferences.forEach((ref, id) => {
            if (now - ref.lastAccessed > 300000) { // 5分以上未使用
                expiredRefs.push(id);
            }
        });

        expiredRefs.forEach(id => this.objectReferences.delete(id));

        // メモリ履歴を縮小
        if (this.memoryHistory.length > this.config.maxHistorySize / 2) {
            this.memoryHistory.splice(0, this.memoryHistory.length - this.config.maxHistorySize / 2);
        }

        console.log(`Lightweight cleanup completed. Removed ${expiredRefs.length} expired references.`);
    }

    /**
     * 積極的なクリーンアップを実行
     */
    private performAggressiveCleanup(): void {
        // すべての期限切れ参照を削除
        this.performLightweightCleanup();

        // 参照カウントが0のオブジェクトを削除
        const unreferencedObjects: string[] = [];
        this.objectReferences.forEach((ref, id) => {
            if (ref.referenceCount <= 0) {
                unreferencedObjects.push(id);
            }
        });

        unreferencedObjects.forEach(id => this.objectReferences.delete(id));

        // 強制ガベージコレクション（可能な場合）
        this.forceGarbageCollection();

        console.log(`Aggressive cleanup completed. Removed ${unreferencedObjects.length} unreferenced objects.`);
    }

    /**
     * 強制ガベージコレクションを実行
     */
    private forceGarbageCollection(): void {
        if (typeof global !== 'undefined' && global.gc) {
            global.gc();
            this.gcCount++;
            console.log('Forced garbage collection executed');
        } else if (typeof window !== 'undefined' && (window as any).gc) {
            (window as any).gc();
            this.gcCount++;
            console.log('Forced garbage collection executed');
        }
    }

    /**
     * メモリリークを検出
     * 要件8.5: エラー時のゲーム全体への影響防止
     */
    private detectMemoryLeaks(): void {
        const leaks = this.analyzeForMemoryLeaks();

        leaks.forEach(leak => {
            console.warn('Memory leak detected:', leak);

            this.leakCallbacks.forEach(callback => {
                try {
                    callback(leak);
                } catch (error) {
                    console.error('Error in memory leak callback:', error);
                }
            });
        });
    }

    /**
     * メモリリークを分析
     */
    private analyzeForMemoryLeaks(): MemoryLeakInfo[] {
        const leaks: MemoryLeakInfo[] = [];
        const now = Date.now();

        // 長時間残存するオブジェクトをチェック
        this.objectReferences.forEach((ref, id) => {
            const age = now - ref.createdAt;

            if (age > 600000 && ref.referenceCount > 0) { // 10分以上残存
                leaks.push({
                    detected: true,
                    leakType: 'long_lived_object',
                    severity: age > 1800000 ? 'high' : 'medium', // 30分以上で高リスク
                    description: `Object ${id} of type ${ref.type} has been alive for ${Math.round(age / 60000)} minutes`,
                    suggestedAction: 'Check if object references are properly cleaned up',
                    timestamp: now
                });
            }
        });

        // メモリ使用量の継続的増加をチェック
        if (this.memoryHistory.length >= 10) {
            const recent = this.memoryHistory.slice(-10);
            const isIncreasing = recent.every((entry, index) => {
                return index === 0 || entry.usedMemory >= recent[index - 1].usedMemory;
            });

            if (isIncreasing) {
                const increase = recent[recent.length - 1].usedMemory - recent[0].usedMemory;
                const increasePercentage = increase / recent[0].usedMemory;

                if (increasePercentage > 0.2) { // 20%以上の増加
                    leaks.push({
                        detected: true,
                        leakType: 'continuous_memory_growth',
                        severity: increasePercentage > 0.5 ? 'critical' : 'high',
                        description: `Memory usage has continuously increased by ${(increasePercentage * 100).toFixed(1)}%`,
                        suggestedAction: 'Investigate continuous memory allocation without cleanup',
                        timestamp: now
                    });
                }
            }
        }

        return leaks;
    }

    /**
     * オブジェクト参照を追跡
     * 要件8.3: メモリ使用量の適切な管理
     */
    trackObject(id: string, type: string, size: number = 0): void {
        this.objectReferences.set(id, {
            id,
            type,
            createdAt: Date.now(),
            lastAccessed: Date.now(),
            referenceCount: 1,
            size
        });
    }

    /**
     * オブジェクト参照を更新
     */
    updateObjectAccess(id: string): void {
        const ref = this.objectReferences.get(id);
        if (ref) {
            ref.lastAccessed = Date.now();
        }
    }

    /**
     * オブジェクト参照カウントを増加
     */
    incrementReference(id: string): void {
        const ref = this.objectReferences.get(id);
        if (ref) {
            ref.referenceCount++;
        }
    }

    /**
     * オブジェクト参照カウントを減少
     */
    decrementReference(id: string): void {
        const ref = this.objectReferences.get(id);
        if (ref) {
            ref.referenceCount--;
            if (ref.referenceCount <= 0) {
                this.objectReferences.delete(id);
            }
        }
    }

    /**
     * オブジェクト参照を削除
     */
    untrackObject(id: string): void {
        this.objectReferences.delete(id);
    }

    /**
     * メモリ警告コールバックを追加
     */
    onMemoryWarning(callback: (info: MemoryUsageInfo) => void): void {
        this.warningCallbacks.push(callback);
    }

    /**
     * メモリリークコールバックを追加
     */
    onMemoryLeak(callback: (leak: MemoryLeakInfo) => void): void {
        this.leakCallbacks.push(callback);
    }

    /**
     * メモリ統計を取得
     */
    getMemoryStats(): {
        current: MemoryUsageInfo;
        history: MemoryHistoryEntry[];
        trackedObjects: number;
        gcCount: number;
    } {
        return {
            current: this.getCurrentMemoryUsage(),
            history: [...this.memoryHistory],
            trackedObjects: this.objectReferences.size,
            gcCount: this.gcCount
        };
    }

    /**
     * メモリレポートを生成
     */
    generateMemoryReport(): string {
        const stats = this.getMemoryStats();
        const current = stats.current;

        let report = '=== Job System Memory Report ===\n';
        report += `Current Usage: ${(current.usagePercentage * 100).toFixed(1)}% (${this.formatBytes(current.usedJSHeapSize)})\n`;
        report += `Total Heap: ${this.formatBytes(current.totalJSHeapSize)}\n`;
        report += `Heap Limit: ${this.formatBytes(current.jsHeapSizeLimit)}\n`;
        report += `Trend: ${current.trend}\n`;
        report += `Tracked Objects: ${stats.trackedObjects}\n`;
        report += `GC Count: ${stats.gcCount}\n`;

        if (stats.history.length > 0) {
            const oldest = stats.history[0];
            const newest = stats.history[stats.history.length - 1];
            const memoryChange = newest.usedMemory - oldest.usedMemory;
            report += `Memory Change: ${memoryChange > 0 ? '+' : ''}${this.formatBytes(memoryChange)} over ${Math.round((newest.timestamp - oldest.timestamp) / 60000)} minutes\n`;
        }

        // オブジェクトタイプ別統計
        const typeStats = new Map<string, { count: number; totalSize: number }>();
        this.objectReferences.forEach(ref => {
            const stats = typeStats.get(ref.type) || { count: 0, totalSize: 0 };
            stats.count++;
            stats.totalSize += ref.size;
            typeStats.set(ref.type, stats);
        });

        if (typeStats.size > 0) {
            report += '\nObject Type Statistics:\n';
            typeStats.forEach((stats, type) => {
                report += `  ${type}: ${stats.count} objects, ${this.formatBytes(stats.totalSize)}\n`;
            });
        }

        return report;
    }

    /**
     * バイト数を人間が読みやすい形式にフォーマット
     */
    private formatBytes(bytes: number): string {
        if (bytes === 0) return '0 B';

        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));

        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * システムを破棄
     * 要件8.5: エラー時のゲーム全体への影響防止
     */
    dispose(): void {
        this.stopMonitoring();

        this.memoryHistory.length = 0;
        this.objectReferences.clear();
        this.warningCallbacks.length = 0;
        this.leakCallbacks.length = 0;

        console.log('JobMemoryMonitor disposed');
    }
}