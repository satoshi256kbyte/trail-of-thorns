/**
 * SkillDebugManager - スキルシステム専用デバッグツール
 * 
 * スキルシステムの開発・デバッグ・バランス調整を支援する機能を提供：
 * - スキル効果と判定の詳細ログ出力
 * - コンソールコマンドによるスキルテスト機能
 * - スキルバランス調整用のツールと統計機能
 * - スキル実行の可視化とデバッグ表示
 * - パフォーマンス監視とメトリクス収集
 */

import * as Phaser from 'phaser';
import {
    Skill,
    SkillData,
    SkillResult,
    SkillExecutionContext,
    SkillUsabilityResult,
    SkillStatistics,
    SkillType,
    TargetType,
    Position
} from '../types/skill';
import { Unit } from '../types/gameplay';
import { SkillSystemConfig } from '../config/GameConfig';

/**
 * スキルデバッグ設定
 */
export interface SkillDebugConfig {
    /** 詳細ログ出力を有効にする */
    enableDetailedLogging: boolean;
    /** スキル効果の可視化を有効にする */
    enableSkillVisualization: boolean;
    /** パフォーマンス監視を有効にする */
    enablePerformanceMonitoring: boolean;
    /** 統計情報の収集を有効にする */
    enableStatisticsCollection: boolean;
    /** バランス調整モードを有効にする */
    enableBalanceMode: boolean;
    /** テストモードを有効にする */
    enableTestMode: boolean;
    /** ログレベル */
    logLevel: 'debug' | 'info' | 'warn' | 'error';
    /** 統計更新間隔（ミリ秒） */
    statisticsUpdateInterval: number;
}

/**
 * スキル実行統計
 */
export interface SkillExecutionStats {
    /** スキルID */
    skillId: string;
    /** 実行回数 */
    executionCount: number;
    /** 成功回数 */
    successCount: number;
    /** 失敗回数 */
    failureCount: number;
    /** 平均実行時間（ミリ秒） */
    averageExecutionTime: number;
    /** 平均ダメージ */
    averageDamage: number;
    /** 平均回復量 */
    averageHealing: number;
    /** 最後の実行時刻 */
    lastExecutionTime: Date;
    /** 使用者別統計 */
    casterStats: Map<string, {
        count: number;
        successRate: number;
        averageDamage: number;
    }>;
}

/**
 * バランス調整データ
 */
export interface SkillBalanceData {
    /** スキルID */
    skillId: string;
    /** 推奨ダメージ範囲 */
    recommendedDamageRange: { min: number; max: number };
    /** 推奨MPコスト */
    recommendedMPCost: number;
    /** 推奨クールダウン */
    recommendedCooldown: number;
    /** 使用頻度 */
    usageFrequency: number;
    /** 効果的な使用率 */
    effectivenessRate: number;
    /** バランススコア（0-100） */
    balanceScore: number;
}

/**
 * スキルテストシナリオ
 */
export interface SkillTestScenario {
    /** シナリオ名 */
    name: string;
    /** 説明 */
    description: string;
    /** テスト対象スキル */
    skillId: string;
    /** 使用者設定 */
    caster: Partial<Unit>;
    /** 対象設定 */
    targets: Partial<Unit>[];
    /** 期待結果 */
    expectedResult: Partial<SkillResult>;
    /** テスト条件 */
    conditions: {
        battlefieldState?: any;
        environmentalFactors?: any;
        customSettings?: any;
    };
}

/**
 * スキルデバッグマネージャー
 */
export class SkillDebugManager extends Phaser.Events.EventEmitter {
    private scene: Phaser.Scene;
    private config: SkillDebugConfig;
    private systemConfig: SkillSystemConfig;
    private isEnabled: boolean = false;

    // 統計データ
    private executionStats: Map<string, SkillExecutionStats> = new Map();
    private balanceData: Map<string, SkillBalanceData> = new Map();
    private performanceMetrics: Map<string, number> = new Map();

    // デバッグ表示要素
    private debugContainer?: Phaser.GameObjects.Container;
    private skillVisualizationGraphics?: Phaser.GameObjects.Graphics;
    private statisticsText?: Phaser.GameObjects.Text;
    private balanceInfoText?: Phaser.GameObjects.Text;

    // テストシナリオ
    private testScenarios: Map<string, SkillTestScenario> = new Map();
    private currentTestResults: Map<string, any> = new Map();

    // ログ履歴
    private logHistory: Array<{
        timestamp: Date;
        level: string;
        message: string;
        data?: any;
    }> = [];

    // パフォーマンス監視
    private lastStatsUpdate: number = 0;
    private executionTimeHistory: number[] = [];

    // デフォルト設定
    private static readonly DEFAULT_CONFIG: SkillDebugConfig = {
        enableDetailedLogging: true,
        enableSkillVisualization: true,
        enablePerformanceMonitoring: true,
        enableStatisticsCollection: true,
        enableBalanceMode: false,
        enableTestMode: false,
        logLevel: 'debug',
        statisticsUpdateInterval: 5000
    };

    /**
     * コンストラクタ
     * @param scene Phaserシーン
     * @param systemConfig スキルシステム設定
     * @param config デバッグ設定
     */
    constructor(
        scene: Phaser.Scene,
        systemConfig: SkillSystemConfig,
        config?: Partial<SkillDebugConfig>
    ) {
        super();

        this.scene = scene;
        this.systemConfig = systemConfig;
        this.config = { ...SkillDebugManager.DEFAULT_CONFIG, ...config };

        this.initializeTestScenarios();
        this.setupKeyboardShortcuts();

        this.log('info', 'SkillDebugManager initialized', { config: this.config });
    }

    /**
     * デバッグモードを有効にする
     */
    enableDebugMode(): void {
        if (this.isEnabled) {
            return;
        }

        this.isEnabled = true;
        this.log('info', 'Skill debug mode enabled');

        // デバッグ表示を作成
        this.createDebugDisplay();

        // 統計収集を開始
        if (this.config.enableStatisticsCollection) {
            this.startStatisticsCollection();
        }

        // パフォーマンス監視を開始
        if (this.config.enablePerformanceMonitoring) {
            this.startPerformanceMonitoring();
        }

        this.emit('debug-mode-enabled');
    }

    /**
     * デバッグモードを無効にする
     */
    disableDebugMode(): void {
        if (!this.isEnabled) {
            return;
        }

        this.isEnabled = false;
        this.log('info', 'Skill debug mode disabled');

        // デバッグ表示を削除
        this.destroyDebugDisplay();

        // 監視を停止
        this.stopStatisticsCollection();
        this.stopPerformanceMonitoring();

        this.emit('debug-mode-disabled');
    }

    /**
     * スキル実行をログに記録
     * @param context 実行コンテキスト
     * @param result 実行結果
     * @param executionTime 実行時間
     */
    logSkillExecution(
        context: SkillExecutionContext,
        result: SkillResult,
        executionTime: number
    ): void {
        if (!this.isEnabled || !this.config.enableDetailedLogging) {
            return;
        }

        const logData = {
            skillId: context.skillId,
            caster: context.caster,
            targetPosition: context.targetPosition,
            success: result.success,
            damage: result.damage,
            healing: result.healing,
            mpCost: result.mpCost,
            executionTime,
            timestamp: context.executionTime
        };

        this.log('debug', 'Skill execution logged', logData);

        // 統計を更新
        if (this.config.enableStatisticsCollection) {
            this.updateExecutionStats(context.skillId, result, executionTime, context.caster);
        }

        // 可視化を更新
        if (this.config.enableSkillVisualization) {
            this.visualizeSkillExecution(context, result);
        }
    }

    /**
     * スキル条件チェックをログに記録
     * @param skillId スキルID
     * @param casterId 使用者ID
     * @param usability 使用可能性結果
     */
    logSkillConditionCheck(
        skillId: string,
        casterId: string,
        usability: SkillUsabilityResult
    ): void {
        if (!this.isEnabled || !this.config.enableDetailedLogging) {
            return;
        }

        const logData = {
            skillId,
            casterId,
            canUse: usability.canUse,
            reason: usability.reason,
            mpCost: usability.mpCost,
            cooldownRemaining: usability.cooldownRemaining
        };

        this.log('debug', 'Skill condition check logged', logData);
    }

    /**
     * スキル効果計算をログに記録
     * @param skillId スキルID
     * @param calculation 計算詳細
     */
    logSkillEffectCalculation(skillId: string, calculation: any): void {
        if (!this.isEnabled || !this.config.enableDetailedLogging) {
            return;
        }

        this.log('debug', 'Skill effect calculation logged', {
            skillId,
            calculation
        });
    }

    /**
     * スキルテストを実行
     * @param scenarioName シナリオ名
     * @returns テスト結果
     */
    async executeSkillTest(scenarioName: string): Promise<any> {
        const scenario = this.testScenarios.get(scenarioName);
        if (!scenario) {
            throw new Error(`Test scenario '${scenarioName}' not found`);
        }

        this.log('info', 'Executing skill test', { scenarioName });

        const startTime = performance.now();

        try {
            // テスト環境をセットアップ
            const testContext = this.setupTestEnvironment(scenario);

            // スキルを実行
            const result = await this.executeSkillInTestEnvironment(scenario, testContext);

            // 結果を検証
            const validation = this.validateTestResult(scenario, result);

            const executionTime = performance.now() - startTime;

            const testResult = {
                scenarioName,
                success: validation.passed,
                result,
                validation,
                executionTime,
                timestamp: new Date()
            };

            // テスト結果を記録
            this.currentTestResults.set(scenarioName, testResult);

            this.log('info', 'Skill test completed', testResult);

            return testResult;

        } catch (error) {
            const executionTime = performance.now() - startTime;

            const testResult = {
                scenarioName,
                success: false,
                error: error.message,
                executionTime,
                timestamp: new Date()
            };

            this.currentTestResults.set(scenarioName, testResult);

            this.log('error', 'Skill test failed', testResult);

            return testResult;
        }
    }

    /**
     * スキルバランス分析を実行
     * @param skillId スキルID
     * @returns バランス分析結果
     */
    analyzeSkillBalance(skillId: string): SkillBalanceData | null {
        const stats = this.executionStats.get(skillId);
        if (!stats) {
            this.log('warn', 'No statistics available for skill balance analysis', { skillId });
            return null;
        }

        // バランススコアを計算
        const balanceScore = this.calculateBalanceScore(stats);

        // 推奨値を計算
        const recommendations = this.calculateRecommendations(stats);

        const balanceData: SkillBalanceData = {
            skillId,
            recommendedDamageRange: recommendations.damageRange,
            recommendedMPCost: recommendations.mpCost,
            recommendedCooldown: recommendations.cooldown,
            usageFrequency: stats.executionCount,
            effectivenessRate: stats.successCount / stats.executionCount,
            balanceScore
        };

        this.balanceData.set(skillId, balanceData);

        this.log('info', 'Skill balance analysis completed', balanceData);

        return balanceData;
    }

    /**
     * 統計情報を取得
     * @param skillId スキルID（省略時は全スキル）
     * @returns 統計情報
     */
    getStatistics(skillId?: string): SkillExecutionStats | Map<string, SkillExecutionStats> {
        if (skillId) {
            return this.executionStats.get(skillId) || null;
        }
        return new Map(this.executionStats);
    }

    /**
     * パフォーマンスメトリクスを取得
     * @returns パフォーマンスメトリクス
     */
    getPerformanceMetrics(): Map<string, number> {
        return new Map(this.performanceMetrics);
    }

    /**
     * バランスデータを取得
     * @param skillId スキルID（省略時は全スキル）
     * @returns バランスデータ
     */
    getBalanceData(skillId?: string): SkillBalanceData | Map<string, SkillBalanceData> {
        if (skillId) {
            return this.balanceData.get(skillId) || null;
        }
        return new Map(this.balanceData);
    }

    /**
     * ログ履歴を取得
     * @param level ログレベルフィルター
     * @param limit 取得件数制限
     * @returns ログ履歴
     */
    getLogHistory(level?: string, limit?: number): Array<any> {
        let logs = this.logHistory;

        if (level) {
            logs = logs.filter(log => log.level === level);
        }

        if (limit) {
            logs = logs.slice(-limit);
        }

        return logs;
    }

    /**
     * 統計をリセット
     */
    resetStatistics(): void {
        this.executionStats.clear();
        this.balanceData.clear();
        this.performanceMetrics.clear();
        this.currentTestResults.clear();
        this.logHistory.length = 0;

        this.log('info', 'Statistics reset');
    }

    /**
     * デバッグ表示を作成
     */
    private createDebugDisplay(): void {
        this.debugContainer = this.scene.add.container(0, 0)
            .setScrollFactor(0)
            .setDepth(10000);

        // スキル可視化用グラフィックス
        if (this.config.enableSkillVisualization) {
            this.skillVisualizationGraphics = this.scene.add.graphics()
                .setScrollFactor(0)
                .setDepth(9999);
            this.debugContainer.add(this.skillVisualizationGraphics);
        }

        // 統計情報表示
        if (this.config.enableStatisticsCollection) {
            this.statisticsText = this.scene.add.text(10, 200, '', {
                fontSize: '12px',
                color: '#00ff00',
                fontFamily: 'monospace',
                backgroundColor: 'rgba(0,0,0,0.8)',
                padding: { x: 5, y: 5 }
            }).setScrollFactor(0);
            this.debugContainer.add(this.statisticsText);
        }

        // バランス情報表示
        if (this.config.enableBalanceMode) {
            this.balanceInfoText = this.scene.add.text(10, 400, '', {
                fontSize: '12px',
                color: '#ffff00',
                fontFamily: 'monospace',
                backgroundColor: 'rgba(0,0,0,0.8)',
                padding: { x: 5, y: 5 }
            }).setScrollFactor(0);
            this.debugContainer.add(this.balanceInfoText);
        }
    }

    /**
     * デバッグ表示を削除
     */
    private destroyDebugDisplay(): void {
        if (this.debugContainer) {
            this.debugContainer.destroy();
            this.debugContainer = undefined;
        }

        this.skillVisualizationGraphics = undefined;
        this.statisticsText = undefined;
        this.balanceInfoText = undefined;
    }

    /**
     * 統計収集を開始
     */
    private startStatisticsCollection(): void {
        this.scene.time.addEvent({
            delay: this.config.statisticsUpdateInterval,
            callback: this.updateStatisticsDisplay,
            callbackScope: this,
            loop: true
        });
    }

    /**
     * 統計収集を停止
     */
    private stopStatisticsCollection(): void {
        // タイマーイベントは自動的にクリーンアップされる
    }

    /**
     * パフォーマンス監視を開始
     */
    private startPerformanceMonitoring(): void {
        this.lastStatsUpdate = performance.now();
    }

    /**
     * パフォーマンス監視を停止
     */
    private stopPerformanceMonitoring(): void {
        this.executionTimeHistory.length = 0;
    }

    /**
     * 実行統計を更新
     */
    private updateExecutionStats(
        skillId: string,
        result: SkillResult,
        executionTime: number,
        casterId: string
    ): void {
        let stats = this.executionStats.get(skillId);
        if (!stats) {
            stats = {
                skillId,
                executionCount: 0,
                successCount: 0,
                failureCount: 0,
                averageExecutionTime: 0,
                averageDamage: 0,
                averageHealing: 0,
                lastExecutionTime: new Date(),
                casterStats: new Map()
            };
            this.executionStats.set(skillId, stats);
        }

        // 基本統計を更新
        stats.executionCount++;
        if (result.success) {
            stats.successCount++;
        } else {
            stats.failureCount++;
        }

        // 平均値を更新
        stats.averageExecutionTime = (stats.averageExecutionTime * (stats.executionCount - 1) + executionTime) / stats.executionCount;

        if (result.damage) {
            stats.averageDamage = (stats.averageDamage * (stats.executionCount - 1) + result.damage) / stats.executionCount;
        }

        if (result.healing) {
            stats.averageHealing = (stats.averageHealing * (stats.executionCount - 1) + result.healing) / stats.executionCount;
        }

        stats.lastExecutionTime = new Date();

        // 使用者別統計を更新
        let casterStat = stats.casterStats.get(casterId);
        if (!casterStat) {
            casterStat = {
                count: 0,
                successRate: 0,
                averageDamage: 0
            };
            stats.casterStats.set(casterId, casterStat);
        }

        casterStat.count++;
        casterStat.successRate = result.success ?
            (casterStat.successRate * (casterStat.count - 1) + 1) / casterStat.count :
            (casterStat.successRate * (casterStat.count - 1)) / casterStat.count;

        if (result.damage) {
            casterStat.averageDamage = (casterStat.averageDamage * (casterStat.count - 1) + result.damage) / casterStat.count;
        }
    }

    /**
     * スキル実行を可視化
     */
    private visualizeSkillExecution(context: SkillExecutionContext, result: SkillResult): void {
        if (!this.skillVisualizationGraphics) {
            return;
        }

        // 実行位置にエフェクトを表示
        const worldPos = this.convertToWorldPosition(context.targetPosition);

        this.skillVisualizationGraphics.clear();

        // 成功/失敗に応じて色を変更
        const color = result.success ? 0x00ff00 : 0xff0000;

        this.skillVisualizationGraphics
            .lineStyle(2, color, 1)
            .strokeCircle(worldPos.x, worldPos.y, 20)
            .fillStyle(color, 0.3)
            .fillCircle(worldPos.x, worldPos.y, 15);

        // 一定時間後に消去
        this.scene.time.delayedCall(2000, () => {
            if (this.skillVisualizationGraphics) {
                this.skillVisualizationGraphics.clear();
            }
        });
    }

    /**
     * 統計表示を更新
     */
    private updateStatisticsDisplay(): void {
        if (!this.statisticsText) {
            return;
        }

        const statsLines: string[] = ['=== Skill Statistics ==='];

        this.executionStats.forEach((stats, skillId) => {
            const successRate = (stats.successCount / stats.executionCount * 100).toFixed(1);
            statsLines.push(
                `${skillId}: ${stats.executionCount} uses, ${successRate}% success, ${stats.averageExecutionTime.toFixed(1)}ms avg`
            );
        });

        // パフォーマンスメトリクス
        statsLines.push('=== Performance ===');
        this.performanceMetrics.forEach((value, key) => {
            statsLines.push(`${key}: ${value.toFixed(2)}`);
        });

        this.statisticsText.setText(statsLines.join('\n'));
    }

    /**
     * テストシナリオを初期化
     */
    private initializeTestScenarios(): void {
        // 基本攻撃スキルテスト
        this.testScenarios.set('basic-attack-skill', {
            name: 'Basic Attack Skill Test',
            description: 'Test basic attack skill functionality',
            skillId: 'fireball',
            caster: {
                id: 'test-caster',
                currentMP: 50,
                stats: { attack: 20, level: 5 }
            },
            targets: [{
                id: 'test-target',
                currentHP: 100,
                stats: { defense: 10 }
            }],
            expectedResult: {
                success: true,
                damage: 15
            },
            conditions: {}
        });

        // 回復スキルテスト
        this.testScenarios.set('heal-skill', {
            name: 'Heal Skill Test',
            description: 'Test healing skill functionality',
            skillId: 'heal',
            caster: {
                id: 'test-healer',
                currentMP: 30,
                stats: { magic: 15, level: 3 }
            },
            targets: [{
                id: 'test-patient',
                currentHP: 50,
                stats: { maxHP: 100 }
            }],
            expectedResult: {
                success: true,
                healing: 25
            },
            conditions: {}
        });
    }

    /**
     * テスト環境をセットアップ
     */
    private setupTestEnvironment(scenario: SkillTestScenario): any {
        // テスト用の環境を作成
        return {
            caster: { ...scenario.caster },
            targets: scenario.targets.map(t => ({ ...t })),
            battlefield: scenario.conditions.battlefieldState || {},
            environment: scenario.conditions.environmentalFactors || {}
        };
    }

    /**
     * テスト環境でスキルを実行
     */
    private async executeSkillInTestEnvironment(
        scenario: SkillTestScenario,
        testContext: any
    ): Promise<SkillResult> {
        // 実際のスキル実行をシミュレート
        // 本来はSkillExecutorを使用するが、ここでは簡略化
        return {
            success: true,
            damage: 15,
            healing: 0,
            mpCost: 10,
            effects: [],
            targetResults: [],
            executionTime: performance.now()
        };
    }

    /**
     * テスト結果を検証
     */
    private validateTestResult(scenario: SkillTestScenario, result: SkillResult): any {
        const validation = {
            passed: true,
            issues: [] as string[]
        };

        const expected = scenario.expectedResult;

        if (expected.success !== undefined && result.success !== expected.success) {
            validation.passed = false;
            validation.issues.push(`Expected success: ${expected.success}, got: ${result.success}`);
        }

        if (expected.damage !== undefined && Math.abs(result.damage - expected.damage) > 5) {
            validation.passed = false;
            validation.issues.push(`Expected damage: ${expected.damage}, got: ${result.damage}`);
        }

        if (expected.healing !== undefined && Math.abs(result.healing - expected.healing) > 5) {
            validation.passed = false;
            validation.issues.push(`Expected healing: ${expected.healing}, got: ${result.healing}`);
        }

        return validation;
    }

    /**
     * バランススコアを計算
     */
    private calculateBalanceScore(stats: SkillExecutionStats): number {
        let score = 50; // 基本スコア

        // 成功率による調整
        const successRate = stats.successCount / stats.executionCount;
        if (successRate > 0.9) {
            score += 20; // 高成功率は良い
        } else if (successRate < 0.5) {
            score -= 30; // 低成功率は問題
        }

        // 使用頻度による調整
        if (stats.executionCount > 100) {
            score += 10; // よく使われるスキルは良い
        } else if (stats.executionCount < 10) {
            score -= 20; // 使われないスキルは問題
        }

        // パフォーマンスによる調整
        if (stats.averageExecutionTime > 1000) {
            score -= 15; // 遅いスキルは問題
        }

        return Math.max(0, Math.min(100, score));
    }

    /**
     * 推奨値を計算
     */
    private calculateRecommendations(stats: SkillExecutionStats): any {
        return {
            damageRange: {
                min: Math.max(1, stats.averageDamage * 0.8),
                max: stats.averageDamage * 1.2
            },
            mpCost: Math.max(1, Math.round(stats.averageDamage * 0.5)),
            cooldown: stats.averageDamage > 50 ? 3 : stats.averageDamage > 25 ? 2 : 1
        };
    }

    /**
     * 座標変換
     */
    private convertToWorldPosition(position: Position): { x: number; y: number } {
        // 実際の実装では、グリッド座標をワールド座標に変換
        return {
            x: position.x * 32 + 16,
            y: position.y * 32 + 16
        };
    }

    /**
     * キーボードショートカットを設定
     */
    private setupKeyboardShortcuts(): void {
        // F5: 統計リセット
        this.scene.input.keyboard?.on('keydown-F5', () => {
            if (this.isEnabled) {
                this.resetStatistics();
            }
        });

        // F6: バランス分析実行
        this.scene.input.keyboard?.on('keydown-F6', () => {
            if (this.isEnabled && this.config.enableBalanceMode) {
                this.executionStats.forEach((_, skillId) => {
                    this.analyzeSkillBalance(skillId);
                });
            }
        });
    }

    /**
     * ログ出力
     */
    private log(level: string, message: string, data?: any): void {
        if (!this.shouldLog(level)) {
            return;
        }

        const logEntry = {
            timestamp: new Date(),
            level,
            message,
            data
        };

        this.logHistory.push(logEntry);

        // ログ履歴のサイズ制限
        if (this.logHistory.length > 1000) {
            this.logHistory.shift();
        }

        // コンソール出力
        const consoleMessage = `[SkillDebug] ${message}`;
        switch (level) {
            case 'debug':
                console.debug(consoleMessage, data || '');
                break;
            case 'info':
                console.info(consoleMessage, data || '');
                break;
            case 'warn':
                console.warn(consoleMessage, data || '');
                break;
            case 'error':
                console.error(consoleMessage, data || '');
                break;
        }
    }

    /**
     * ログレベルチェック
     */
    private shouldLog(level: string): boolean {
        const levels = ['debug', 'info', 'warn', 'error'];
        const currentLevelIndex = levels.indexOf(this.config.logLevel);
        const messageLevelIndex = levels.indexOf(level);
        return messageLevelIndex >= currentLevelIndex;
    }

    /**
     * リソースを破棄
     */
    destroy(): void {
        this.disableDebugMode();
        this.resetStatistics();
        this.removeAllListeners();
    }
}