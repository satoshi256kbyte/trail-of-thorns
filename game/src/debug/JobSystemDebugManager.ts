/**
 * JobSystemDebugManager - 職業システムデバッグ・開発支援ツール
 * 
 * このクラスは職業システムのデバッグ機能、開発支援ツール、
 * パフォーマンス監視機能を提供します。
 */

import { JobSystem } from '../systems/jobs/JobSystem';
import { JobSystemConsoleCommands } from './JobSystemConsoleCommands';

/**
 * デバッグ情報の表示設定
 */
export interface JobSystemDebugConfig {
    showJobInfo: boolean;
    showRoseEssenceInfo: boolean;
    showRankUpInfo: boolean;
    showPerformanceMetrics: boolean;
    showEventLog: boolean;
    logLevel: 'debug' | 'info' | 'warn' | 'error';
}

/**
 * パフォーマンス監視データ
 */
export interface JobSystemPerformanceMetrics {
    jobChangeCount: number;
    rankUpCount: number;
    roseEssenceTransactions: number;
    averageJobChangeTime: number;
    averageRankUpTime: number;
    memoryUsage: number;
    eventCount: number;
    lastResetTime: number;
}

/**
 * 職業システムデバッグマネージャー
 */
export class JobSystemDebugManager {
    private jobSystem: JobSystem;
    private consoleCommands: JobSystemConsoleCommands;
    private config: JobSystemDebugConfig;
    private performanceMetrics: JobSystemPerformanceMetrics;
    private eventLog: Array<{ timestamp: number; event: string; data: any }> = [];
    private debugContainer?: Phaser.GameObjects.Container;
    private debugText?: Phaser.GameObjects.Text;

    private static readonly DEFAULT_CONFIG: JobSystemDebugConfig = {
        showJobInfo: true,
        showRoseEssenceInfo: true,
        showRankUpInfo: true,
        showPerformanceMetrics: false,
        showEventLog: false,
        logLevel: 'info',
    };

    constructor(jobSystem: JobSystem, config?: Partial<JobSystemDebugConfig>) {
        this.jobSystem = jobSystem;
        this.config = { ...JobSystemDebugManager.DEFAULT_CONFIG, ...config };
        this.consoleCommands = new JobSystemConsoleCommands(jobSystem);

        this.performanceMetrics = {
            jobChangeCount: 0,
            rankUpCount: 0,
            roseEssenceTransactions: 0,
            averageJobChangeTime: 0,
            averageRankUpTime: 0,
            memoryUsage: 0,
            eventCount: 0,
            lastResetTime: Date.now(),
        };

        this.setupEventListeners();
        this.setupConsoleCommands();
    }

    /**
     * デバッグ表示を初期化
     * 
     * @param scene Phaserシーン
     */
    public initializeDebugDisplay(scene: Phaser.Scene): void {
        if (!scene) return;

        // デバッグ表示コンテナを作成
        this.debugContainer = scene.add.container(10, 10);
        this.debugContainer.setDepth(1000);

        // デバッグテキストを作成
        this.debugText = scene.add.text(0, 0, '', {
            fontSize: '12px',
            color: '#00ff00',
            backgroundColor: '#000000',
            padding: { x: 5, y: 5 },
        });

        this.debugContainer.add(this.debugText);

        // 定期更新を開始
        scene.time.addEvent({
            delay: 1000, // 1秒ごと
            callback: this.updateDebugDisplay,
            callbackScope: this,
            loop: true,
        });
    }

    /**
     * デバッグ表示を更新
     */
    private updateDebugDisplay(): void {
        if (!this.debugText) return;

        const debugInfo: string[] = [];

        // 職業情報表示
        if (this.config.showJobInfo) {
            const stats = this.jobSystem.getSystemStats();
            debugInfo.push('=== Job System Info ===');
            debugInfo.push(`Total Jobs: ${stats.totalJobs}`);
            debugInfo.push(`Total Characters: ${stats.totalCharacters}`);
            debugInfo.push(`Average Job Rank: ${stats.averageJobRank.toFixed(2)}`);
            debugInfo.push('');
        }

        // 薔薇の力情報表示
        if (this.config.showRoseEssenceInfo) {
            const currentEssence = this.jobSystem.getCurrentRoseEssence();
            debugInfo.push('=== Rose Essence Info ===');
            debugInfo.push(`Current Amount: ${currentEssence}`);
            debugInfo.push(`Transactions: ${this.performanceMetrics.roseEssenceTransactions}`);
            debugInfo.push('');
        }

        // ランクアップ情報表示
        if (this.config.showRankUpInfo) {
            const candidates = this.jobSystem.getRankUpCandidates();
            debugInfo.push('=== Rank Up Info ===');
            debugInfo.push(`Candidates: ${candidates.length}`);
            debugInfo.push(`Total Rank Ups: ${this.performanceMetrics.rankUpCount}`);
            debugInfo.push('');
        }

        // パフォーマンス情報表示
        if (this.config.showPerformanceMetrics) {
            debugInfo.push('=== Performance Metrics ===');
            debugInfo.push(`Job Changes: ${this.performanceMetrics.jobChangeCount}`);
            debugInfo.push(`Avg Job Change Time: ${this.performanceMetrics.averageJobChangeTime.toFixed(2)}ms`);
            debugInfo.push(`Avg Rank Up Time: ${this.performanceMetrics.averageRankUpTime.toFixed(2)}ms`);
            debugInfo.push(`Events: ${this.performanceMetrics.eventCount}`);
            debugInfo.push('');
        }

        // イベントログ表示
        if (this.config.showEventLog) {
            debugInfo.push('=== Recent Events ===');
            const recentEvents = this.eventLog.slice(-5);
            for (const event of recentEvents) {
                const time = new Date(event.timestamp).toLocaleTimeString();
                debugInfo.push(`${time}: ${event.event}`);
            }
            debugInfo.push('');
        }

        this.debugText.setText(debugInfo.join('\n'));
    }

    /**
     * イベントリスナーを設定
     */
    private setupEventListeners(): void {
        // 職業変更イベント
        this.jobSystem.on('job_changed', (data) => {
            this.performanceMetrics.jobChangeCount++;
            this.logEvent('job_changed', data);
        });

        // ランクアップイベント
        this.jobSystem.on('rank_up_completed', (data) => {
            this.performanceMetrics.rankUpCount++;
            this.logEvent('rank_up_completed', data);
        });

        // 薔薇の力イベント
        this.jobSystem.on('rose_essence_awarded', (data) => {
            this.performanceMetrics.roseEssenceTransactions++;
            this.logEvent('rose_essence_awarded', data);
        });

        // システムエラーイベント
        this.jobSystem.on('system_error', (data) => {
            this.logEvent('system_error', data, 'error');
        });

        // 全イベントをカウント
        this.jobSystem.on('*', () => {
            this.performanceMetrics.eventCount++;
        });
    }

    /**
     * コンソールコマンドを設定
     */
    private setupConsoleCommands(): void {
        if (typeof window !== 'undefined') {
            (window as any).jobSystemDebug = {
                // 基本情報表示
                showInfo: () => this.showSystemInfo(),
                showStats: () => this.showSystemStats(),
                showPerformance: () => this.showPerformanceMetrics(),

                // 職業管理
                listJobs: () => this.consoleCommands.listJobs(),
                setJob: (characterId: string, jobId: string, rank?: number) =>
                    this.consoleCommands.setCharacterJob(characterId, jobId, rank),
                changeJob: (characterId: string, jobId: string) =>
                    this.consoleCommands.changeCharacterJob(characterId, jobId),
                rankUp: (characterId: string, targetRank?: number) =>
                    this.consoleCommands.rankUpCharacter(characterId, targetRank),

                // 薔薇の力管理
                addEssence: (amount: number, source?: string) =>
                    this.consoleCommands.addRoseEssence(amount, source),
                showEssence: () => this.consoleCommands.showRoseEssenceInfo(),
                resetEssence: () => this.consoleCommands.resetRoseEssence(),

                // デバッグ機能
                toggleDebug: (category?: string) => this.toggleDebugCategory(category),
                resetMetrics: () => this.resetPerformanceMetrics(),
                exportData: () => this.exportDebugData(),
                importData: (data: any) => this.importDebugData(data),

                // ヘルプ
                help: () => this.showHelp(),
            };

            console.log('JobSystem Debug Commands loaded. Type jobSystemDebug.help() for available commands.');
        }
    }

    /**
     * イベントをログに記録
     */
    private logEvent(event: string, data: any, level: string = 'info'): void {
        const logEntry = {
            timestamp: Date.now(),
            event,
            data,
        };

        this.eventLog.push(logEntry);

        // ログサイズを制限（最新100件のみ保持）
        if (this.eventLog.length > 100) {
            this.eventLog.shift();
        }

        // コンソールに出力
        if (this.shouldLog(level)) {
            const time = new Date(logEntry.timestamp).toLocaleTimeString();
            console.log(`[JobSystem ${level.toUpperCase()}] ${time}: ${event}`, data);
        }
    }

    /**
     * ログレベルをチェック
     */
    private shouldLog(level: string): boolean {
        const levels = ['debug', 'info', 'warn', 'error'];
        const currentLevelIndex = levels.indexOf(this.config.logLevel);
        const messageLevelIndex = levels.indexOf(level);
        return messageLevelIndex >= currentLevelIndex;
    }

    /**
     * システム情報を表示
     */
    private showSystemInfo(): void {
        const info = {
            initialized: this.jobSystem.isSystemInitialized(),
            totalJobs: this.jobSystem.getAllJobs().size,
            currentRoseEssence: this.jobSystem.getCurrentRoseEssence(),
            config: this.config,
        };

        console.table(info);
    }

    /**
     * システム統計を表示
     */
    private showSystemStats(): void {
        const stats = this.jobSystem.getSystemStats();
        console.table(stats);
    }

    /**
     * パフォーマンス指標を表示
     */
    private showPerformanceMetrics(): void {
        console.table(this.performanceMetrics);
    }

    /**
     * デバッグカテゴリーの表示を切り替え
     */
    private toggleDebugCategory(category?: string): void {
        if (!category) {
            console.log('Available debug categories:', Object.keys(this.config));
            return;
        }

        if (category in this.config) {
            (this.config as any)[category] = !(this.config as any)[category];
            console.log(`Debug category '${category}' is now ${(this.config as any)[category] ? 'enabled' : 'disabled'}`);
        } else {
            console.warn(`Unknown debug category: ${category}`);
        }
    }

    /**
     * パフォーマンス指標をリセット
     */
    private resetPerformanceMetrics(): void {
        this.performanceMetrics = {
            jobChangeCount: 0,
            rankUpCount: 0,
            roseEssenceTransactions: 0,
            averageJobChangeTime: 0,
            averageRankUpTime: 0,
            memoryUsage: 0,
            eventCount: 0,
            lastResetTime: Date.now(),
        };

        this.eventLog = [];
        console.log('Performance metrics reset.');
    }

    /**
     * デバッグデータをエクスポート
     */
    private exportDebugData(): any {
        const data = {
            timestamp: new Date().toISOString(),
            systemStats: this.jobSystem.getSystemStats(),
            performanceMetrics: this.performanceMetrics,
            eventLog: this.eventLog.slice(-50), // 最新50件
            config: this.config,
            backup: this.jobSystem.createBackup(),
        };

        console.log('Debug data exported:', data);
        return data;
    }

    /**
     * デバッグデータをインポート
     */
    private importDebugData(data: any): void {
        try {
            if (data.backup) {
                this.jobSystem.restoreFromBackup(data.backup);
                console.log('System state restored from debug data.');
            }

            if (data.config) {
                this.config = { ...this.config, ...data.config };
                console.log('Debug config updated.');
            }

            console.log('Debug data imported successfully.');
        } catch (error) {
            console.error('Failed to import debug data:', error);
        }
    }

    /**
     * ヘルプを表示
     */
    private showHelp(): void {
        const commands = [
            '=== JobSystem Debug Commands ===',
            '',
            'Information:',
            '  showInfo()                    - Show system information',
            '  showStats()                   - Show system statistics',
            '  showPerformance()             - Show performance metrics',
            '',
            'Job Management:',
            '  listJobs()                    - List all available jobs',
            '  setJob(charId, jobId, rank)   - Set character job',
            '  changeJob(charId, jobId)      - Change character job',
            '  rankUp(charId, targetRank)    - Rank up character job',
            '',
            'Rose Essence:',
            '  addEssence(amount, source)    - Add rose essence',
            '  showEssence()                 - Show rose essence info',
            '  resetEssence()                - Reset rose essence',
            '',
            'Debug Tools:',
            '  toggleDebug(category)         - Toggle debug category',
            '  resetMetrics()                - Reset performance metrics',
            '  exportData()                  - Export debug data',
            '  importData(data)              - Import debug data',
            '',
            'Usage Examples:',
            '  jobSystemDebug.setJob("player1", "warrior", 2)',
            '  jobSystemDebug.addEssence(50, "debug")',
            '  jobSystemDebug.toggleDebug("showPerformanceMetrics")',
        ];

        console.log(commands.join('\n'));
    }

    /**
     * 設定を更新
     */
    public updateConfig(newConfig: Partial<JobSystemDebugConfig>): void {
        this.config = { ...this.config, ...newConfig };
        console.log('Debug config updated:', this.config);
    }

    /**
     * デバッグ表示を破棄
     */
    public destroy(): void {
        if (this.debugContainer) {
            this.debugContainer.destroy();
        }

        // コンソールコマンドを削除
        if (typeof window !== 'undefined') {
            delete (window as any).jobSystemDebug;
        }

        console.log('JobSystemDebugManager destroyed.');
    }
}