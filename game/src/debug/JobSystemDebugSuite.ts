/**
 * JobSystemDebugSuite - 職業システム統合デバッグスイート
 * 
 * このクラスは職業システムの全デバッグツールを統合し、
 * 一元的なデバッグ環境を提供します。
 */

import { JobSystem } from '../systems/jobs/JobSystem';
import { JobSystemDebugManager } from './JobSystemDebugManager';
import { JobSystemBalanceTool } from './JobSystemBalanceTool';
import { JobSystemDevelopmentTools } from './JobSystemDevelopmentTools';
import { JobSystemPerformanceMonitor } from './JobSystemPerformanceMonitor';
import { JobDataValidator } from './JobDataValidator';
import { RoseEssenceDebugManager } from './RoseEssenceDebugManager';

/**
 * デバッグスイート設定
 */
export interface DebugSuiteConfig {
    // 有効化するツール
    tools: {
        debugManager: boolean;
        balanceTool: boolean;
        developmentTools: boolean;
        performanceMonitor: boolean;
        dataValidator: boolean;
        roseEssenceDebugger: boolean;
    };

    // 自動機能
    auto: {
        enableOnStart: boolean;
        runInitialTests: boolean;
        enablePerformanceMonitoring: boolean;
        enableDataValidation: boolean;
    };

    // UI設定
    ui: {
        showDebugPanel: boolean;
        enableHotkeys: boolean;
        enableNotifications: boolean;
        theme: 'dark' | 'light';
    };
}

/**
 * デバッグ統計
 */
export interface DebugStatistics {
    sessionStartTime: number;
    totalCommands: number;
    toolsUsed: string[];
    errorsDetected: number;
    warningsGenerated: number;
    optimizationsApplied: number;
    testsRun: number;
    validationsPerformed: number;
}

/**
 * 職業システム統合デバッグスイート
 */
export class JobSystemDebugSuite {
    private jobSystem: JobSystem;
    private config: DebugSuiteConfig;
    private statistics: DebugStatistics;

    // デバッグツール
    private debugManager?: JobSystemDebugManager;
    private balanceTool?: JobSystemBalanceTool;
    private developmentTools?: JobSystemDevelopmentTools;
    private performanceMonitor?: JobSystemPerformanceMonitor;
    private dataValidator?: JobDataValidator;
    private roseEssenceDebugger?: RoseEssenceDebugManager;

    // UI要素
    private debugPanel?: HTMLElement;
    private notificationContainer?: HTMLElement;

    private static readonly DEFAULT_CONFIG: DebugSuiteConfig = {
        tools: {
            debugManager: true,
            balanceTool: true,
            developmentTools: true,
            performanceMonitor: true,
            dataValidator: true,
            roseEssenceDebugger: true,
        },
        auto: {
            enableOnStart: true,
            runInitialTests: false,
            enablePerformanceMonitoring: true,
            enableDataValidation: true,
        },
        ui: {
            showDebugPanel: false,
            enableHotkeys: true,
            enableNotifications: true,
            theme: 'dark',
        },
    };

    constructor(jobSystem: JobSystem, config?: Partial<DebugSuiteConfig>) {
        this.jobSystem = jobSystem;
        this.config = { ...JobSystemDebugSuite.DEFAULT_CONFIG, ...config };

        this.statistics = {
            sessionStartTime: Date.now(),
            totalCommands: 0,
            toolsUsed: [],
            errorsDetected: 0,
            warningsGenerated: 0,
            optimizationsApplied: 0,
            testsRun: 0,
            validationsPerformed: 0,
        };

        this.initializeTools();
        this.setupGlobalCommands();
        this.setupUI();
        this.setupEventListeners();

        if (this.config.auto.enableOnStart) {
            this.enable();
        }
    }

    /**
     * デバッグツールを初期化
     */
    private initializeTools(): void {
        const { tools } = this.config;

        if (tools.debugManager) {
            this.debugManager = new JobSystemDebugManager(this.jobSystem);
            this.addToolToStatistics('debugManager');
        }

        if (tools.balanceTool) {
            this.balanceTool = new JobSystemBalanceTool(this.jobSystem);
            this.addToolToStatistics('balanceTool');
        }

        if (tools.developmentTools) {
            this.developmentTools = new JobSystemDevelopmentTools(this.jobSystem);
            this.addToolToStatistics('developmentTools');
        }

        if (tools.performanceMonitor) {
            this.performanceMonitor = new JobSystemPerformanceMonitor(this.jobSystem);
            this.addToolToStatistics('performanceMonitor');
        }

        if (tools.dataValidator) {
            this.dataValidator = new JobDataValidator();
            this.addToolToStatistics('dataValidator');
        }

        if (tools.roseEssenceDebugger) {
            const roseEssenceManager = this.jobSystem.getRoseEssenceManager?.();
            if (roseEssenceManager) {
                this.roseEssenceDebugger = new RoseEssenceDebugManager(roseEssenceManager);
                this.addToolToStatistics('roseEssenceDebugger');
            }
        }
    }

    /**
     * グローバルコマンドを設定
     */
    private setupGlobalCommands(): void {
        if (typeof window !== 'undefined') {
            (window as any).jobDebug = {
                // スイート制御
                enable: () => this.enable(),
                disable: () => this.disable(),
                reset: () => this.reset(),

                // ツールアクセス
                debug: this.debugManager,
                balance: this.balanceTool,
                dev: this.developmentTools,
                perf: this.performanceMonitor,
                validate: this.dataValidator,
                essence: this.roseEssenceDebugger,

                // 統合機能
                runAllTests: () => this.runAllTests(),
                validateAll: () => this.validateAllData(),
                optimizeAll: () => this.optimizeAll(),
                generateReport: () => this.generateComprehensiveReport(),

                // 統計・情報
                stats: () => this.getStatistics(),
                status: () => this.getStatus(),
                tools: () => this.listAvailableTools(),

                // UI制御
                showPanel: () => this.showDebugPanel(),
                hidePanel: () => this.hideDebugPanel(),
                togglePanel: () => this.toggleDebugPanel(),

                // 設定
                config: (newConfig?: Partial<DebugSuiteConfig>) => {
                    if (newConfig) {
                        this.updateConfig(newConfig);
                        return 'Config updated';
                    }
                    return this.config;
                },

                // ヘルプ
                help: () => this.showHelp(),
            };

            console.log('🔧 Job System Debug Suite loaded. Type jobDebug.help() for commands.');
        }
    }

    /**
     * UIを設定
     */
    private setupUI(): void {
        if (typeof document === 'undefined') return;

        // デバッグパネルを作成
        this.createDebugPanel();

        // 通知コンテナを作成
        this.createNotificationContainer();

        // ホットキーを設定
        if (this.config.ui.enableHotkeys) {
            this.setupHotkeys();
        }
    }

    /**
     * デバッグパネルを作成
     */
    private createDebugPanel(): void {
        if (typeof document === 'undefined') return;

        this.debugPanel = document.createElement('div');
        this.debugPanel.id = 'job-debug-panel';
        this.debugPanel.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            width: 400px;
            max-height: 80vh;
            background: ${this.config.ui.theme === 'dark' ? '#1a1a1a' : '#ffffff'};
            color: ${this.config.ui.theme === 'dark' ? '#ffffff' : '#000000'};
            border: 1px solid ${this.config.ui.theme === 'dark' ? '#333' : '#ccc'};
            border-radius: 8px;
            padding: 15px;
            font-family: 'Courier New', monospace;
            font-size: 12px;
            z-index: 10000;
            overflow-y: auto;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            display: none;
        `;

        // ヘッダー
        const header = document.createElement('div');
        header.style.cssText = `
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 15px;
            padding-bottom: 10px;
            border-bottom: 1px solid ${this.config.ui.theme === 'dark' ? '#333' : '#ccc'};
        `;

        const title = document.createElement('h3');
        title.textContent = '🔧 Job System Debug';
        title.style.margin = '0';

        const closeButton = document.createElement('button');
        closeButton.textContent = '✕';
        closeButton.style.cssText = `
            background: none;
            border: none;
            color: inherit;
            font-size: 16px;
            cursor: pointer;
            padding: 0;
            width: 20px;
            height: 20px;
        `;
        closeButton.onclick = () => this.hideDebugPanel();

        header.appendChild(title);
        header.appendChild(closeButton);
        this.debugPanel.appendChild(header);

        // コンテンツエリア
        const content = document.createElement('div');
        content.id = 'debug-panel-content';
        this.debugPanel.appendChild(content);

        document.body.appendChild(this.debugPanel);
    }

    /**
     * 通知コンテナを作成
     */
    private createNotificationContainer(): void {
        if (typeof document === 'undefined') return;

        this.notificationContainer = document.createElement('div');
        this.notificationContainer.id = 'job-debug-notifications';
        this.notificationContainer.style.cssText = `
            position: fixed;
            top: 10px;
            left: 10px;
            z-index: 10001;
            pointer-events: none;
        `;

        document.body.appendChild(this.notificationContainer);
    }

    /**
     * ホットキーを設定
     */
    private setupHotkeys(): void {
        if (typeof document === 'undefined') return;

        document.addEventListener('keydown', (event) => {
            // Ctrl + Shift + D でデバッグパネル切り替え
            if (event.ctrlKey && event.shiftKey && event.key === 'D') {
                event.preventDefault();
                this.toggleDebugPanel();
            }

            // Ctrl + Shift + T で全テスト実行
            if (event.ctrlKey && event.shiftKey && event.key === 'T') {
                event.preventDefault();
                this.runAllTests();
            }

            // Ctrl + Shift + V で全データ検証
            if (event.ctrlKey && event.shiftKey && event.key === 'V') {
                event.preventDefault();
                this.validateAllData();
            }

            // Ctrl + Shift + O で最適化実行
            if (event.ctrlKey && event.shiftKey && event.key === 'O') {
                event.preventDefault();
                this.optimizeAll();
            }
        });
    }

    /**
     * イベントリスナーを設定
     */
    private setupEventListeners(): void {
        // 各ツールからのイベントを監視
        if (this.debugManager) {
            this.debugManager.on('log_entry', (entry) => {
                if (entry.level >= 2) { // WARN以上
                    this.statistics.warningsGenerated++;
                }
                if (entry.level >= 3) { // ERROR以上
                    this.statistics.errorsDetected++;
                }
            });
        }

        if (this.performanceMonitor) {
            // パフォーマンス警告の監視
            // 実装はPerformanceMonitorのAPIに依存
        }
    }

    /**
     * デバッグスイートを有効化
     */
    enable(): void {
        console.log('🔧 Job System Debug Suite enabled');

        // 自動機能を開始
        if (this.config.auto.runInitialTests) {
            setTimeout(() => this.runAllTests(), 1000);
        }

        if (this.config.auto.enablePerformanceMonitoring && this.performanceMonitor) {
            this.performanceMonitor.startMonitoring();
        }

        if (this.config.auto.enableDataValidation) {
            setTimeout(() => this.validateAllData(), 2000);
        }

        // デバッグパネルを表示
        if (this.config.ui.showDebugPanel) {
            this.showDebugPanel();
        }

        this.showNotification('Debug Suite Enabled', 'success');
    }

    /**
     * デバッグスイートを無効化
     */
    disable(): void {
        console.log('🔧 Job System Debug Suite disabled');

        // パフォーマンス監視を停止
        if (this.performanceMonitor) {
            this.performanceMonitor.stopMonitoring();
        }

        // デバッグパネルを非表示
        this.hideDebugPanel();

        this.showNotification('Debug Suite Disabled', 'info');
    }

    /**
     * デバッグスイートをリセット
     */
    reset(): void {
        console.log('🔧 Resetting Job System Debug Suite...');

        // 統計をリセット
        this.statistics = {
            sessionStartTime: Date.now(),
            totalCommands: 0,
            toolsUsed: [],
            errorsDetected: 0,
            warningsGenerated: 0,
            optimizationsApplied: 0,
            testsRun: 0,
            validationsPerformed: 0,
        };

        // 各ツールをリセット
        if (this.performanceMonitor) {
            this.performanceMonitor.resetMetrics();
        }

        if (this.debugManager) {
            this.debugManager.clearLogs();
        }

        this.showNotification('Debug Suite Reset', 'info');
    }

    /**
     * 全テストを実行
     */
    async runAllTests(): Promise<any> {
        console.log('🧪 Running all tests...');
        this.showNotification('Running All Tests...', 'info');

        const results: any = {
            timestamp: new Date().toISOString(),
            results: {},
        };

        try {
            // バランステスト
            if (this.balanceTool) {
                results.results.balance = this.balanceTool.runAllBalanceTests();
                this.statistics.testsRun += results.results.balance.length;
            }

            // データ検証
            if (this.dataValidator && this.jobSystem.getAllJobs) {
                const jobs = Array.from(this.jobSystem.getAllJobs().values());
                const jobDataArray = jobs.map(job => this.extractJobData(job));
                results.results.validation = this.dataValidator.validateAllJobData(jobDataArray);
                this.statistics.validationsPerformed += results.results.validation.length;
            }

            // パフォーマンステスト
            if (this.performanceMonitor) {
                results.results.performance = this.performanceMonitor.runBenchmark();
            }

            const passedTests = this.countPassedTests(results.results);
            const totalTests = this.countTotalTests(results.results);

            console.log(`✅ All tests completed: ${passedTests}/${totalTests} passed`);
            this.showNotification(`Tests Complete: ${passedTests}/${totalTests} passed`,
                passedTests === totalTests ? 'success' : 'warning');

            return results;

        } catch (error) {
            console.error('❌ Test execution failed:', error);
            this.showNotification('Test Execution Failed', 'error');
            throw error;
        }
    }

    /**
     * 全データを検証
     */
    validateAllData(): any {
        if (!this.dataValidator) {
            console.warn('Data validator not available');
            return null;
        }

        console.log('🔍 Validating all job data...');
        this.showNotification('Validating All Data...', 'info');

        try {
            const jobs = Array.from(this.jobSystem.getAllJobs().values());
            const jobDataArray = jobs.map(job => this.extractJobData(job));
            const results = this.dataValidator.validateAllJobData(jobDataArray);

            const validJobs = results.filter(r => r.isValid).length;
            const totalJobs = results.length;
            const totalErrors = results.reduce((sum, r) => sum + r.errors.length, 0);

            console.log(`✅ Data validation complete: ${validJobs}/${totalJobs} jobs valid, ${totalErrors} errors found`);
            this.showNotification(`Validation Complete: ${validJobs}/${totalJobs} valid`,
                totalErrors === 0 ? 'success' : 'warning');

            this.statistics.validationsPerformed += results.length;
            return results;

        } catch (error) {
            console.error('❌ Data validation failed:', error);
            this.showNotification('Data Validation Failed', 'error');
            throw error;
        }
    }

    /**
     * 全最適化を実行
     */
    optimizeAll(): void {
        console.log('⚡ Running all optimizations...');
        this.showNotification('Running Optimizations...', 'info');

        let optimizationsApplied = 0;

        try {
            // パフォーマンス最適化
            if (this.performanceMonitor) {
                this.performanceMonitor.runOptimization();
                optimizationsApplied++;
            }

            // JobSystemの最適化
            if (this.jobSystem.optimizeCache) {
                this.jobSystem.optimizeCache();
                optimizationsApplied++;
            }

            // ガベージコレクション
            if (typeof global !== 'undefined' && global.gc) {
                global.gc();
                optimizationsApplied++;
            }

            console.log(`✅ Optimizations complete: ${optimizationsApplied} applied`);
            this.showNotification(`Optimizations Complete: ${optimizationsApplied} applied`, 'success');

            this.statistics.optimizationsApplied += optimizationsApplied;

        } catch (error) {
            console.error('❌ Optimization failed:', error);
            this.showNotification('Optimization Failed', 'error');
        }
    }

    /**
     * 包括的レポートを生成
     */
    generateComprehensiveReport(): string {
        console.log('📊 Generating comprehensive report...');

        const report = {
            timestamp: new Date().toISOString(),
            sessionDuration: Date.now() - this.statistics.sessionStartTime,
            statistics: this.statistics,
            config: this.config,
            status: this.getStatus(),
            tools: {},
        };

        // 各ツールからレポートを収集
        if (this.balanceTool) {
            report.tools = { ...report.tools, balance: this.balanceTool.generateBalanceReport() };
        }

        if (this.performanceMonitor) {
            report.tools = { ...report.tools, performance: this.performanceMonitor.generateReport() };
        }

        if (this.debugManager) {
            report.tools = { ...report.tools, debug: this.debugManager.exportLogs() };
        }

        const reportText = JSON.stringify(report, null, 2);
        console.log('📊 Comprehensive report generated');

        return reportText;
    }

    /**
     * 統計を取得
     */
    getStatistics(): DebugStatistics {
        return { ...this.statistics };
    }

    /**
     * ステータスを取得
     */
    getStatus(): any {
        return {
            enabled: true,
            sessionDuration: Date.now() - this.statistics.sessionStartTime,
            toolsLoaded: this.statistics.toolsUsed.length,
            availableTools: this.listAvailableTools(),
            memoryUsage: this.getMemoryUsage(),
            systemHealth: this.getSystemHealth(),
        };
    }

    /**
     * 利用可能ツール一覧を取得
     */
    listAvailableTools(): string[] {
        const tools: string[] = [];

        if (this.debugManager) tools.push('debugManager');
        if (this.balanceTool) tools.push('balanceTool');
        if (this.developmentTools) tools.push('developmentTools');
        if (this.performanceMonitor) tools.push('performanceMonitor');
        if (this.dataValidator) tools.push('dataValidator');
        if (this.roseEssenceDebugger) tools.push('roseEssenceDebugger');

        return tools;
    }

    /**
     * デバッグパネルを表示
     */
    showDebugPanel(): void {
        if (this.debugPanel) {
            this.debugPanel.style.display = 'block';
            this.updateDebugPanelContent();
        }
    }

    /**
     * デバッグパネルを非表示
     */
    hideDebugPanel(): void {
        if (this.debugPanel) {
            this.debugPanel.style.display = 'none';
        }
    }

    /**
     * デバッグパネルの表示を切り替え
     */
    toggleDebugPanel(): void {
        if (this.debugPanel) {
            if (this.debugPanel.style.display === 'none') {
                this.showDebugPanel();
            } else {
                this.hideDebugPanel();
            }
        }
    }

    /**
     * デバッグパネルの内容を更新
     */
    private updateDebugPanelContent(): void {
        const content = document.getElementById('debug-panel-content');
        if (!content) return;

        const status = this.getStatus();
        const stats = this.getStatistics();

        content.innerHTML = `
            <div style="margin-bottom: 15px;">
                <strong>Session Duration:</strong> ${Math.floor(status.sessionDuration / 1000)}s<br>
                <strong>Tools Loaded:</strong> ${status.toolsLoaded}<br>
                <strong>Memory Usage:</strong> ${this.formatBytes(status.memoryUsage)}<br>
                <strong>System Health:</strong> ${status.systemHealth}
            </div>
            
            <div style="margin-bottom: 15px;">
                <strong>Statistics:</strong><br>
                Commands: ${stats.totalCommands}<br>
                Tests Run: ${stats.testsRun}<br>
                Validations: ${stats.validationsPerformed}<br>
                Errors: ${stats.errorsDetected}<br>
                Warnings: ${stats.warningsGenerated}<br>
                Optimizations: ${stats.optimizationsApplied}
            </div>
            
            <div style="margin-bottom: 15px;">
                <strong>Quick Actions:</strong><br>
                <button onclick="jobDebug.runAllTests()" style="margin: 2px; padding: 5px 10px; font-size: 11px;">Run Tests</button>
                <button onclick="jobDebug.validateAll()" style="margin: 2px; padding: 5px 10px; font-size: 11px;">Validate</button>
                <button onclick="jobDebug.optimizeAll()" style="margin: 2px; padding: 5px 10px; font-size: 11px;">Optimize</button>
                <button onclick="jobDebug.reset()" style="margin: 2px; padding: 5px 10px; font-size: 11px;">Reset</button>
            </div>
            
            <div>
                <strong>Available Tools:</strong><br>
                ${status.availableTools.map((tool: string) => `• ${tool}`).join('<br>')}
            </div>
        `;
    }

    /**
     * 通知を表示
     */
    private showNotification(message: string, type: 'info' | 'success' | 'warning' | 'error'): void {
        if (!this.config.ui.enableNotifications || !this.notificationContainer) {
            return;
        }

        const notification = document.createElement('div');
        notification.style.cssText = `
            background: ${this.getNotificationColor(type)};
            color: white;
            padding: 10px 15px;
            margin-bottom: 5px;
            border-radius: 4px;
            font-family: 'Courier New', monospace;
            font-size: 12px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            pointer-events: auto;
            cursor: pointer;
            transition: opacity 0.3s ease;
        `;
        notification.textContent = message;

        // クリックで削除
        notification.onclick = () => notification.remove();

        this.notificationContainer.appendChild(notification);

        // 5秒後に自動削除
        setTimeout(() => {
            if (notification.parentNode) {
                notification.style.opacity = '0';
                setTimeout(() => notification.remove(), 300);
            }
        }, 5000);
    }

    /**
     * 通知の色を取得
     */
    private getNotificationColor(type: string): string {
        switch (type) {
            case 'success': return '#28a745';
            case 'warning': return '#ffc107';
            case 'error': return '#dc3545';
            default: return '#17a2b8';
        }
    }

    /**
     * JobオブジェクトからJobDataを抽出
     */
    private extractJobData(job: any): any {
        // 簡易実装 - 実際のJobクラスの構造に合わせて調整が必要
        return {
            id: job.id,
            name: job.name,
            description: job.description || '',
            category: job.category,
            maxRank: job.maxRank,
            statModifiers: {},
            availableSkills: {},
            rankUpRequirements: {},
            growthRateModifiers: {},
            jobTraits: [],
            visual: {
                iconPath: '',
                spriteModifications: [],
                colorScheme: { primary: '#ffffff', secondary: '#cccccc' },
            },
        };
    }

    /**
     * 成功したテスト数をカウント
     */
    private countPassedTests(results: any): number {
        let passed = 0;

        if (results.balance) {
            passed += results.balance.filter((r: any) => r.passed).length;
        }

        if (results.validation) {
            passed += results.validation.filter((r: any) => r.isValid).length;
        }

        return passed;
    }

    /**
     * 総テスト数をカウント
     */
    private countTotalTests(results: any): number {
        let total = 0;

        if (results.balance) {
            total += results.balance.length;
        }

        if (results.validation) {
            total += results.validation.length;
        }

        return total;
    }

    /**
     * メモリ使用量を取得
     */
    private getMemoryUsage(): number {
        if (typeof performance !== 'undefined' && performance.memory) {
            return performance.memory.usedJSHeapSize;
        }
        return 0;
    }

    /**
     * システム健全性を取得
     */
    private getSystemHealth(): string {
        try {
            const healthCheck = this.jobSystem.performHealthCheck?.();
            return healthCheck?.isHealthy ? 'Healthy' : 'Issues Detected';
        } catch (error) {
            return 'Unknown';
        }
    }

    /**
     * バイト数をフォーマット
     */
    private formatBytes(bytes: number): string {
        if (bytes === 0) return '0 Bytes';

        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));

        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * 統計にツールを追加
     */
    private addToolToStatistics(toolName: string): void {
        if (!this.statistics.toolsUsed.includes(toolName)) {
            this.statistics.toolsUsed.push(toolName);
        }
    }

    /**
     * 設定を更新
     */
    updateConfig(newConfig: Partial<DebugSuiteConfig>): void {
        this.config = { ...this.config, ...newConfig };
        console.log('Debug suite config updated:', this.config);
    }

    /**
     * ヘルプを表示
     */
    private showHelp(): void {
        const commands = [
            '🔧 === Job System Debug Suite Commands ===',
            '',
            'Suite Control:',
            '  enable()                  - Enable debug suite',
            '  disable()                 - Disable debug suite',
            '  reset()                   - Reset all statistics and tools',
            '',
            'Tool Access:',
            '  debug                     - Debug manager (logging, events)',
            '  balance                   - Balance testing tool',
            '  dev                       - Development tools',
            '  perf                      - Performance monitor',
            '  validate                  - Data validator',
            '  essence                   - Rose essence debugger',
            '',
            'Integrated Actions:',
            '  runAllTests()             - Run all available tests',
            '  validateAll()             - Validate all job data',
            '  optimizeAll()             - Run all optimizations',
            '  generateReport()          - Generate comprehensive report',
            '',
            'Information:',
            '  stats()                   - Get debug statistics',
            '  status()                  - Get current status',
            '  tools()                   - List available tools',
            '',
            'UI Control:',
            '  showPanel()               - Show debug panel',
            '  hidePanel()               - Hide debug panel',
            '  togglePanel()             - Toggle debug panel',
            '',
            'Configuration:',
            '  config()                  - Get current config',
            '  config(newConfig)         - Update config',
            '',
            'Hotkeys:',
            '  Ctrl+Shift+D              - Toggle debug panel',
            '  Ctrl+Shift+T              - Run all tests',
            '  Ctrl+Shift+V              - Validate all data',
            '  Ctrl+Shift+O              - Optimize all',
            '',
            'Usage Examples:',
            '  jobDebug.runAllTests()',
            '  jobDebug.balance.testJobProgression()',
            '  jobDebug.dev.loadTestData("basic")',
            '  jobDebug.perf.benchmark()',
            '  jobDebug.validate.validate(myJobData)',
        ];

        console.log(commands.join('\n'));
    }

    /**
     * リソースを破棄
     */
    destroy(): void {
        // 各ツールを破棄
        if (this.debugManager) {
            this.debugManager.destroy();
        }

        if (this.performanceMonitor) {
            this.performanceMonitor.destroy();
        }

        // UI要素を削除
        if (this.debugPanel) {
            this.debugPanel.remove();
        }

        if (this.notificationContainer) {
            this.notificationContainer.remove();
        }

        // グローバルコマンドを削除
        if (typeof window !== 'undefined') {
            delete (window as any).jobDebug;
        }

        console.log('🔧 Job System Debug Suite destroyed');
    }
}