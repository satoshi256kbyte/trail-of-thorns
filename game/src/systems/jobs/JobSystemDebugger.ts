/**
 * JobSystemDebugger - 職業システムのデバッグとログ記録システム
 * 
 * このクラスは職業システムのデバッグ支援、詳細ログ記録、パフォーマンス監視、
 * 開発者向けツールを提供します。
 * 要件8.5: ログ記録とデバッグ支援に対応した機能を提供します。
 */

import { JobSystemError, JobSystemContext } from '../../types/job';

/**
 * ログレベル
 */
export enum LogLevel {
    DEBUG = 0,
    INFO = 1,
    WARN = 2,
    ERROR = 3,
    CRITICAL = 4,
}

/**
 * ログエントリ
 */
export interface LogEntry {
    timestamp: Date;
    level: LogLevel;
    category: string;
    message: string;
    data?: any;
    stackTrace?: string;
    sessionId: string;
    userId?: string;
}

/**
 * パフォーマンス測定データ
 */
export interface PerformanceMetric {
    name: string;
    startTime: number;
    endTime?: number;
    duration?: number;
    metadata?: any;
}

/**
 * デバッグ統計
 */
export interface DebugStatistics {
    totalLogs: number;
    logsByLevel: Map<LogLevel, number>;
    logsByCategory: Map<string, number>;
    averagePerformance: Map<string, number>;
    errorRate: number;
    sessionDuration: number;
}

/**
 * デバッグ設定
 */
export interface DebugConfig {
    enabled: boolean;
    logLevel: LogLevel;
    maxLogEntries: number;
    enablePerformanceTracking: boolean;
    enableStackTrace: boolean;
    enableConsoleOutput: boolean;
    enableRemoteLogging: boolean;
    categories: string[];
}

/**
 * JobSystemDebuggerクラス
 */
export class JobSystemDebugger extends Phaser.Events.EventEmitter {
    private config: DebugConfig;
    private logs: LogEntry[] = [];
    private performanceMetrics: Map<string, PerformanceMetric> = new Map();
    private sessionId: string;
    private sessionStartTime: number;
    private debugCommands: Map<string, Function> = new Map();

    private static readonly DEFAULT_CONFIG: DebugConfig = {
        enabled: false,
        logLevel: LogLevel.INFO,
        maxLogEntries: 10000,
        enablePerformanceTracking: true,
        enableStackTrace: true,
        enableConsoleOutput: true,
        enableRemoteLogging: false,
        categories: ['job', 'rank_up', 'rose_essence', 'error', 'performance'],
    };

    /**
     * Debuggerインスタンスを作成
     * @param config デバッグ設定
     */
    constructor(config?: Partial<DebugConfig>) {
        super();

        this.config = { ...JobSystemDebugger.DEFAULT_CONFIG, ...config };
        this.sessionId = this.generateSessionId();
        this.sessionStartTime = Date.now();

        this.initializeDebugCommands();
        this.setupGlobalErrorCapture();

        if (this.config.enabled) {
            this.log(LogLevel.INFO, 'debugger', 'JobSystemDebugger initialized', {
                sessionId: this.sessionId,
                config: this.config,
            });
        }
    }

    /**
     * ログを記録
     * 
     * @param level ログレベル
     * @param category カテゴリ
     * @param message メッセージ
     * @param data 追加データ
     */
    public log(level: LogLevel, category: string, message: string, data?: any): void {
        if (!this.config.enabled || level < this.config.logLevel) {
            return;
        }

        if (!this.config.categories.includes(category)) {
            return;
        }

        const logEntry: LogEntry = {
            timestamp: new Date(),
            level,
            category,
            message,
            data,
            stackTrace: this.config.enableStackTrace ? new Error().stack : undefined,
            sessionId: this.sessionId,
        };

        this.logs.push(logEntry);

        // ログサイズ制限
        if (this.logs.length > this.config.maxLogEntries) {
            this.logs.shift();
        }

        // コンソール出力
        if (this.config.enableConsoleOutput) {
            this.outputToConsole(logEntry);
        }

        // リモートログ送信
        if (this.config.enableRemoteLogging) {
            this.sendToRemoteLogger(logEntry);
        }

        // ログイベントを発行
        this.emit('log_entry', logEntry);
    }

    /**
     * デバッグログを記録
     */
    public debug(category: string, message: string, data?: any): void {
        this.log(LogLevel.DEBUG, category, message, data);
    }

    /**
     * 情報ログを記録
     */
    public info(category: string, message: string, data?: any): void {
        this.log(LogLevel.INFO, category, message, data);
    }

    /**
     * 警告ログを記録
     */
    public warn(category: string, message: string, data?: any): void {
        this.log(LogLevel.WARN, category, message, data);
    }

    /**
     * エラーログを記録
     */
    public error(category: string, message: string, data?: any): void {
        this.log(LogLevel.ERROR, category, message, data);
    }

    /**
     * 重大エラーログを記録
     */
    public critical(category: string, message: string, data?: any): void {
        this.log(LogLevel.CRITICAL, category, message, data);
    }

    /**
     * パフォーマンス測定を開始
     * 
     * @param name 測定名
     * @param metadata メタデータ
     */
    public startPerformanceTracking(name: string, metadata?: any): void {
        if (!this.config.enabled || !this.config.enablePerformanceTracking) {
            return;
        }

        const metric: PerformanceMetric = {
            name,
            startTime: performance.now(),
            metadata,
        };

        this.performanceMetrics.set(name, metric);
        this.debug('performance', `Performance tracking started: ${name}`, metadata);
    }

    /**
     * パフォーマンス測定を終了
     * 
     * @param name 測定名
     * @returns 測定結果
     */
    public endPerformanceTracking(name: string): PerformanceMetric | null {
        if (!this.config.enabled || !this.config.enablePerformanceTracking) {
            return null;
        }

        const metric = this.performanceMetrics.get(name);
        if (!metric) {
            this.warn('performance', `Performance metric not found: ${name}`);
            return null;
        }

        metric.endTime = performance.now();
        metric.duration = metric.endTime - metric.startTime;

        this.debug('performance', `Performance tracking ended: ${name}`, {
            duration: metric.duration,
            metadata: metric.metadata,
        });

        this.performanceMetrics.delete(name);
        return metric;
    }

    /**
     * 職業システムの状態をログ
     * 
     * @param jobSystem JobSystemインスタンス
     */
    public logJobSystemState(jobSystem: any): void {
        if (!this.config.enabled) return;

        try {
            const state = {
                initialized: jobSystem.isSystemInitialized?.(),
                totalJobs: jobSystem.getAllJobs?.()?.size || 0,
                currentRoseEssence: jobSystem.getCurrentRoseEssence?.() || 0,
                rankUpCandidates: jobSystem.getRankUpCandidates?.()?.length || 0,
                systemStats: jobSystem.getSystemStats?.(),
            };

            this.info('job', 'JobSystem state snapshot', state);
        } catch (error) {
            this.error('job', 'Failed to capture JobSystem state', { error });
        }
    }

    /**
     * エラーコンテキストをログ
     * 
     * @param error エラー種別
     * @param context エラーコンテキスト
     */
    public logErrorContext(error: JobSystemError, context: JobSystemContext): void {
        const errorData = {
            error,
            context,
            timestamp: new Date().toISOString(),
            sessionId: this.sessionId,
        };

        this.error('error', `JobSystem error occurred: ${error}`, errorData);

        // 重大エラーの場合は追加情報を記録
        if (error === JobSystemError.DATA_CORRUPTION) {
            this.critical('error', 'Data corruption detected', {
                context,
                systemState: this.captureSystemState(),
            });
        }
    }

    /**
     * 職業変更をログ
     * 
     * @param characterId キャラクターID
     * @param oldJobId 旧職業ID
     * @param newJobId 新職業ID
     * @param success 成功フラグ
     */
    public logJobChange(
        characterId: string,
        oldJobId: string,
        newJobId: string,
        success: boolean
    ): void {
        this.info('job', 'Job change attempt', {
            characterId,
            oldJobId,
            newJobId,
            success,
            timestamp: new Date().toISOString(),
        });
    }

    /**
     * ランクアップをログ
     * 
     * @param characterId キャラクターID
     * @param jobId 職業ID
     * @param oldRank 旧ランク
     * @param newRank 新ランク
     * @param roseEssenceUsed 使用した薔薇の力
     * @param success 成功フラグ
     */
    public logRankUp(
        characterId: string,
        jobId: string,
        oldRank: number,
        newRank: number,
        roseEssenceUsed: number,
        success: boolean
    ): void {
        this.info('rank_up', 'Rank up attempt', {
            characterId,
            jobId,
            oldRank,
            newRank,
            roseEssenceUsed,
            success,
            timestamp: new Date().toISOString(),
        });
    }

    /**
     * 薔薇の力の変動をログ
     * 
     * @param type 変動種別
     * @param amount 変動量
     * @param source 変動源
     * @param currentTotal 現在の合計
     */
    public logRoseEssenceChange(
        type: 'gain' | 'spend',
        amount: number,
        source: string,
        currentTotal: number
    ): void {
        this.info('rose_essence', `Rose essence ${type}`, {
            type,
            amount,
            source,
            currentTotal,
            timestamp: new Date().toISOString(),
        });
    }

    /**
     * システム状態をキャプチャ
     */
    private captureSystemState(): any {
        return {
            sessionId: this.sessionId,
            sessionDuration: Date.now() - this.sessionStartTime,
            logCount: this.logs.length,
            activeMetrics: this.performanceMetrics.size,
            memoryUsage: this.getMemoryUsage(),
            timestamp: new Date().toISOString(),
        };
    }

    /**
     * メモリ使用量を取得
     */
    private getMemoryUsage(): any {
        if (typeof performance !== 'undefined' && performance.memory) {
            return {
                usedJSHeapSize: performance.memory.usedJSHeapSize,
                totalJSHeapSize: performance.memory.totalJSHeapSize,
                jsHeapSizeLimit: performance.memory.jsHeapSizeLimit,
            };
        }
        return null;
    }

    /**
     * コンソールに出力
     */
    private outputToConsole(logEntry: LogEntry): void {
        const levelNames = ['DEBUG', 'INFO', 'WARN', 'ERROR', 'CRITICAL'];
        const levelName = levelNames[logEntry.level];
        const timestamp = logEntry.timestamp.toISOString();

        const message = `[${timestamp}] [${levelName}] [${logEntry.category}] ${logEntry.message}`;

        switch (logEntry.level) {
            case LogLevel.DEBUG:
                console.debug(message, logEntry.data);
                break;
            case LogLevel.INFO:
                console.info(message, logEntry.data);
                break;
            case LogLevel.WARN:
                console.warn(message, logEntry.data);
                break;
            case LogLevel.ERROR:
            case LogLevel.CRITICAL:
                console.error(message, logEntry.data);
                break;
        }
    }

    /**
     * リモートロガーに送信
     */
    private sendToRemoteLogger(logEntry: LogEntry): void {
        // リモートログ送信の実装（将来的にAWS CloudWatch Logsなど）
        this.emit('remote_log', logEntry);
    }

    /**
     * デバッグコマンドを初期化
     */
    private initializeDebugCommands(): void {
        this.debugCommands.set('logs', (filter?: string) => {
            return this.getLogs(filter);
        });

        this.debugCommands.set('stats', () => {
            return this.getStatistics();
        });

        this.debugCommands.set('clear', () => {
            this.clearLogs();
            return 'Logs cleared';
        });

        this.debugCommands.set('performance', () => {
            return Array.from(this.performanceMetrics.values());
        });

        this.debugCommands.set('export', () => {
            return this.exportLogs();
        });

        this.debugCommands.set('config', (newConfig?: any) => {
            if (newConfig) {
                this.updateConfig(newConfig);
                return 'Config updated';
            }
            return this.config;
        });

        // グローバルデバッグオブジェクトに登録
        if (typeof window !== 'undefined') {
            (window as any).jobSystemDebug = {
                logs: (filter?: string) => this.debugCommands.get('logs')?.(filter),
                stats: () => this.debugCommands.get('stats')?.(),
                clear: () => this.debugCommands.get('clear')?.(),
                performance: () => this.debugCommands.get('performance')?.(),
                export: () => this.debugCommands.get('export')?.(),
                config: (newConfig?: any) => this.debugCommands.get('config')?.(newConfig),
            };
        }
    }

    /**
     * グローバルエラーキャプチャを設定
     */
    private setupGlobalErrorCapture(): void {
        if (typeof window !== 'undefined') {
            window.addEventListener('error', (event) => {
                if (event.error && event.error.message?.includes('JobSystem')) {
                    this.critical('error', 'Uncaught exception in JobSystem', {
                        message: event.error.message,
                        filename: event.filename,
                        lineno: event.lineno,
                        colno: event.colno,
                        stack: event.error.stack,
                    });
                }
            });

            window.addEventListener('unhandledrejection', (event) => {
                if (event.reason && event.reason.message?.includes('JobSystem')) {
                    this.critical('error', 'Unhandled promise rejection in JobSystem', {
                        reason: event.reason.message,
                        stack: event.reason.stack,
                    });
                }
            });
        }
    }

    /**
     * ログを取得
     * 
     * @param filter フィルター文字列
     * @returns ログエントリ配列
     */
    public getLogs(filter?: string): LogEntry[] {
        let filteredLogs = [...this.logs];

        if (filter) {
            const filterLower = filter.toLowerCase();
            filteredLogs = filteredLogs.filter(
                log =>
                    log.category.toLowerCase().includes(filterLower) ||
                    log.message.toLowerCase().includes(filterLower)
            );
        }

        return filteredLogs.reverse(); // 新しい順
    }

    /**
     * 統計情報を取得
     */
    public getStatistics(): DebugStatistics {
        const stats: DebugStatistics = {
            totalLogs: this.logs.length,
            logsByLevel: new Map(),
            logsByCategory: new Map(),
            averagePerformance: new Map(),
            errorRate: 0,
            sessionDuration: Date.now() - this.sessionStartTime,
        };

        let errorCount = 0;

        for (const log of this.logs) {
            // レベル別統計
            const levelCount = stats.logsByLevel.get(log.level) || 0;
            stats.logsByLevel.set(log.level, levelCount + 1);

            // カテゴリ別統計
            const categoryCount = stats.logsByCategory.get(log.category) || 0;
            stats.logsByCategory.set(log.category, categoryCount + 1);

            // エラー率計算
            if (log.level >= LogLevel.ERROR) {
                errorCount++;
            }
        }

        stats.errorRate = this.logs.length > 0 ? errorCount / this.logs.length : 0;

        return stats;
    }

    /**
     * ログをクリア
     */
    public clearLogs(): void {
        this.logs = [];
        this.performanceMetrics.clear();
        this.emit('logs_cleared');
    }

    /**
     * ログをエクスポート
     */
    public exportLogs(): string {
        const exportData = {
            sessionId: this.sessionId,
            sessionStartTime: new Date(this.sessionStartTime).toISOString(),
            exportTime: new Date().toISOString(),
            config: this.config,
            statistics: this.getStatistics(),
            logs: this.logs,
            systemState: this.captureSystemState(),
        };

        return JSON.stringify(exportData, null, 2);
    }

    /**
     * セッションIDを生成
     */
    private generateSessionId(): string {
        return `debug_session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * 設定を更新
     */
    public updateConfig(newConfig: Partial<DebugConfig>): void {
        const oldConfig = { ...this.config };
        this.config = { ...this.config, ...newConfig };

        this.info('debugger', 'Debug config updated', {
            oldConfig,
            newConfig: this.config,
        });

        this.emit('config_updated', this.config);
    }

    /**
     * デバッグモードを有効/無効化
     */
    public setEnabled(enabled: boolean): void {
        this.config.enabled = enabled;

        if (enabled) {
            this.info('debugger', 'Debug mode enabled');
        } else {
            this.info('debugger', 'Debug mode disabled');
        }
    }

    /**
     * リソースを破棄
     */
    public destroy(): void {
        this.clearLogs();
        this.removeAllListeners();

        // グローバルデバッグオブジェクトを削除
        if (typeof window !== 'undefined') {
            delete (window as any).jobSystemDebug;
        }
    }
}