/**
 * ExperienceDebugManager - 経験値システムデバッグマネージャー
 * 
 * このクラスは経験値システムのデバッグ機能を提供します:
 * - 経験値・レベルアップシミュレーション・デバッグ機能
 * - 経験値獲得と成長計算の詳細ログ出力とデバッグ表示
 * - 経験値バランス調整用のツールと統計機能
 * 
 * 要件: 全要件の設定可能性とデバッグ支援
 * 
 * @version 1.0.0
 * @author Trail of Thorns Development Team
 */

import * as Phaser from 'phaser';
import {
    ExperienceInfo,
    LevelUpResult,
    ExperienceSource,
    ExperienceAction,
    ExperienceContext,
    StatGrowthResult,
    ExperienceStatistics,
    ExperienceCalculationResult,
    GrowthRates
} from '../types/experience';
import { Unit } from '../types/gameplay';
import { ExperienceSystem } from '../systems/experience/ExperienceSystem';
import { GameConfig, ExperienceSystemConfig } from '../config/GameConfig';

/**
 * デバッグ表示情報
 */
interface DebugDisplayInfo {
    characterId: string;
    position: { x: number; y: number };
    experienceInfo: ExperienceInfo;
    recentGains: ExperienceCalculationResult[];
    levelUpHistory: LevelUpResult[];
}

/**
 * シミュレーション結果
 */
interface SimulationResult {
    characterId: string;
    initialLevel: number;
    finalLevel: number;
    totalExperienceGained: number;
    levelUpsCount: number;
    statGrowthTotal: StatGrowthResult;
    simulationDuration: number;
}

/**
 * バランス調整統計
 */
interface BalanceStatistics {
    averageExperiencePerAction: Record<ExperienceAction, number>;
    averageLevelUpTime: number;
    statGrowthDistribution: Record<string, number>;
    experienceSourceEfficiency: Record<ExperienceSource, number>;
    levelProgressionCurve: number[];
}

/**
 * ExperienceDebugManagerクラス
 * 経験値システムのデバッグ機能を統合管理
 */
export class ExperienceDebugManager {
    private scene: Phaser.Scene;
    private experienceSystem: ExperienceSystem;
    private config: ExperienceSystemConfig;

    // デバッグ表示
    private debugGraphics: Phaser.GameObjects.Graphics;
    private debugText: Phaser.GameObjects.Text;
    private debugDisplays: Map<string, DebugDisplayInfo> = new Map();

    // 統計情報
    private statistics: ExperienceStatistics;
    private balanceStatistics: BalanceStatistics;
    private performanceMetrics: Map<string, number[]> = new Map();

    // シミュレーション
    private simulationResults: SimulationResult[] = [];
    private isSimulationRunning: boolean = false;

    // ログ管理
    private logHistory: string[] = [];
    private maxLogHistory: number = 1000;

    constructor(scene: Phaser.Scene, experienceSystem: ExperienceSystem) {
        this.scene = scene;
        this.experienceSystem = experienceSystem;
        this.config = GameConfig.EXPERIENCE_SYSTEM;

        // デバッグ表示を初期化
        this.initializeDebugDisplay();

        // 統計情報を初期化
        this.initializeStatistics();

        // イベントリスナーを設定
        this.setupEventListeners();

        console.log('ExperienceDebugManager initialized');
    }

    /**
     * デバッグ表示を初期化
     */
    private initializeDebugDisplay(): void {
        if (!this.config.enableExperienceDebug) {
            return;
        }

        // デバッグ用グラフィックス
        this.debugGraphics = this.scene.add.graphics();
        this.debugGraphics.setDepth(1000);

        // デバッグ用テキスト
        this.debugText = this.scene.add.text(10, 10, '', {
            fontSize: '12px',
            color: '#ffffff',
            backgroundColor: '#000000',
            padding: { x: 5, y: 5 }
        });
        this.debugText.setDepth(1001);
        this.debugText.setScrollFactor(0);
    }

    /**
     * 統計情報を初期化
     */
    private initializeStatistics(): void {
        this.statistics = {
            totalExperienceGained: 0,
            experienceBySource: {} as Record<ExperienceSource, number>,
            experienceByAction: {} as Record<ExperienceAction, number>,
            totalLevelUps: 0,
            averageStatGrowth: {
                hp: 0, mp: 0, attack: 0, defense: 0, speed: 0, skill: 0, luck: 0
            },
            sessionStartTime: Date.now(),
            sessionDuration: 0
        };

        // 経験値源別統計を初期化
        Object.values(ExperienceSource).forEach(source => {
            this.statistics.experienceBySource[source] = 0;
        });

        // アクション別統計を初期化
        Object.values(ExperienceAction).forEach(action => {
            this.statistics.experienceByAction[action] = 0;
        });

        this.balanceStatistics = {
            averageExperiencePerAction: {} as Record<ExperienceAction, number>,
            averageLevelUpTime: 0,
            statGrowthDistribution: {},
            experienceSourceEfficiency: {} as Record<ExperienceSource, number>,
            levelProgressionCurve: []
        };
    }

    /**
     * イベントリスナーを設定
     */
    private setupEventListeners(): void {
        // 経験値獲得イベント
        this.experienceSystem.on('experience-awarded', (data: any) => {
            this.onExperienceAwarded(data);
        });

        // レベルアップイベント
        this.experienceSystem.on('level-up-processed', (data: any) => {
            this.onLevelUpProcessed(data);
        });

        // システム設定変更イベント
        this.experienceSystem.on('experience-system-config-updated', (data: any) => {
            this.onConfigUpdated(data.config);
        });
    }

    /**
     * 経験値獲得イベントハンドラー
     */
    private onExperienceAwarded(data: {
        characterId: string;
        action: ExperienceAction;
        context: ExperienceContext;
        result: ExperienceCalculationResult;
    }): void {
        // 統計情報を更新
        this.statistics.totalExperienceGained += data.result.finalAmount;
        this.statistics.experienceBySource[data.result.source] += data.result.finalAmount;
        this.statistics.experienceByAction[data.result.action] += data.result.finalAmount;

        // デバッグ表示を更新
        this.updateDebugDisplay(data.characterId, data.result);

        // 詳細ログを出力
        if (this.config.showExperienceCalculationDebug) {
            this.logExperienceCalculation(data);
        }

        // パフォーマンスメトリクスを記録
        this.recordPerformanceMetric('experience-calculation', Date.now());
    }

    /**
     * レベルアップイベントハンドラー
     */
    private onLevelUpProcessed(data: {
        characterId: string;
        result: LevelUpResult;
    }): void {
        // 統計情報を更新
        this.statistics.totalLevelUps++;
        this.updateAverageStatGrowth(data.result.statGrowth);

        // デバッグ表示を更新
        this.updateLevelUpDebugDisplay(data.characterId, data.result);

        // 詳細ログを出力
        if (this.config.showLevelUpProcessingDebug) {
            this.logLevelUpProcessing(data);
        }

        // パフォーマンスメトリクスを記録
        this.recordPerformanceMetric('level-up-processing', Date.now());
    }

    /**
     * 設定更新イベントハンドラー
     */
    private onConfigUpdated(config: ExperienceSystemConfig): void {
        this.config = config;

        if (!config.enableExperienceDebug && this.debugGraphics) {
            this.debugGraphics.setVisible(false);
            this.debugText.setVisible(false);
        } else if (config.enableExperienceDebug) {
            if (this.debugGraphics) {
                this.debugGraphics.setVisible(true);
                this.debugText.setVisible(true);
            } else {
                this.initializeDebugDisplay();
            }
        }
    }

    /**
     * 経験値計算の詳細ログを出力
     */
    private logExperienceCalculation(data: {
        characterId: string;
        action: ExperienceAction;
        context: ExperienceContext;
        result: ExperienceCalculationResult;
    }): void {
        const logMessage = [
            `[EXP CALC] Character: ${data.characterId}`,
            `Action: ${data.action}, Source: ${data.result.source}`,
            `Base: ${data.result.baseAmount}, Multiplied: ${data.result.multipliedAmount}`,
            `Bonus: ${data.result.bonusAmount}, Final: ${data.result.finalAmount}`,
            `Context: ${JSON.stringify(data.context, null, 2)}`
        ].join(' | ');

        console.log(logMessage);
        this.addToLogHistory(logMessage);
    }

    /**
     * レベルアップ処理の詳細ログを出力
     */
    private logLevelUpProcessing(data: {
        characterId: string;
        result: LevelUpResult;
    }): void {
        const logMessage = [
            `[LEVEL UP] Character: ${data.characterId}`,
            `${data.result.oldLevel} → ${data.result.newLevel}`,
            `Stat Growth: HP+${data.result.statGrowth.hp}, MP+${data.result.statGrowth.mp}`,
            `ATK+${data.result.statGrowth.attack}, DEF+${data.result.statGrowth.defense}`,
            `SPD+${data.result.statGrowth.speed}, SKL+${data.result.statGrowth.skill}, LCK+${data.result.statGrowth.luck}`
        ].join(' | ');

        console.log(logMessage);
        this.addToLogHistory(logMessage);
    }

    /**
     * 成長計算の詳細ログを出力
     */
    public logGrowthCalculation(
        characterId: string,
        growthRates: GrowthRates,
        statGrowth: StatGrowthResult,
        rolls: Record<string, number>
    ): void {
        if (!this.config.showGrowthCalculationDebug) {
            return;
        }

        const logMessage = [
            `[GROWTH CALC] Character: ${characterId}`,
            `Rates: HP${growthRates.hp}%, MP${growthRates.mp}%, ATK${growthRates.attack}%`,
            `DEF${growthRates.defense}%, SPD${growthRates.speed}%, SKL${growthRates.skill}%, LCK${growthRates.luck}%`,
            `Rolls: ${JSON.stringify(rolls)}`,
            `Growth: HP+${statGrowth.hp}, MP+${statGrowth.mp}, ATK+${statGrowth.attack}`,
            `DEF+${statGrowth.defense}, SPD+${statGrowth.speed}, SKL+${statGrowth.skill}, LCK+${statGrowth.luck}`
        ].join(' | ');

        console.log(logMessage);
        this.addToLogHistory(logMessage);
    }

    /**
     * デバッグ表示を更新
     */
    private updateDebugDisplay(characterId: string, result: ExperienceCalculationResult): void {
        if (!this.config.enableExperienceDebug) {
            return;
        }

        let displayInfo = this.debugDisplays.get(characterId);
        if (!displayInfo) {
            displayInfo = {
                characterId,
                position: { x: 0, y: 0 },
                experienceInfo: this.experienceSystem.getExperienceInfo(characterId),
                recentGains: [],
                levelUpHistory: []
            };
            this.debugDisplays.set(characterId, displayInfo);
        }

        // 最近の経験値獲得を記録
        displayInfo.recentGains.push(result);
        if (displayInfo.recentGains.length > 10) {
            displayInfo.recentGains.shift();
        }

        // 経験値情報を更新
        displayInfo.experienceInfo = this.experienceSystem.getExperienceInfo(characterId);

        this.renderDebugDisplay();
    }

    /**
     * レベルアップデバッグ表示を更新
     */
    private updateLevelUpDebugDisplay(characterId: string, result: LevelUpResult): void {
        if (!this.config.enableExperienceDebug) {
            return;
        }

        let displayInfo = this.debugDisplays.get(characterId);
        if (!displayInfo) {
            return;
        }

        // レベルアップ履歴を記録
        displayInfo.levelUpHistory.push(result);
        if (displayInfo.levelUpHistory.length > 5) {
            displayInfo.levelUpHistory.shift();
        }

        this.renderDebugDisplay();
    }

    /**
     * デバッグ表示をレンダリング
     */
    private renderDebugDisplay(): void {
        if (!this.config.enableExperienceDebug || !this.debugGraphics || !this.debugText) {
            return;
        }

        this.debugGraphics.clear();

        // 統計情報を表示
        const debugInfo = [
            'Experience System Debug',
            `Total EXP: ${this.statistics.totalExperienceGained}`,
            `Level Ups: ${this.statistics.totalLevelUps}`,
            `Session: ${Math.floor((Date.now() - this.statistics.sessionStartTime) / 1000)}s`,
            '',
            'Recent Activity:'
        ];

        // 最近のアクティビティを表示
        let activityCount = 0;
        for (const [characterId, displayInfo] of this.debugDisplays) {
            if (activityCount >= 5) break;

            if (displayInfo.recentGains.length > 0) {
                const recentGain = displayInfo.recentGains[displayInfo.recentGains.length - 1];
                debugInfo.push(`${characterId}: +${recentGain.finalAmount} EXP (${recentGain.source})`);
                activityCount++;
            }
        }

        this.debugText.setText(debugInfo.join('\n'));

        // キャラクター別デバッグ表示
        this.renderCharacterDebugInfo();
    }

    /**
     * キャラクター別デバッグ情報をレンダリング
     */
    private renderCharacterDebugInfo(): void {
        for (const [characterId, displayInfo] of this.debugDisplays) {
            const { position, experienceInfo } = displayInfo;

            // 経験値バーを描画
            if (this.config.showExperienceStatistics) {
                this.drawExperienceBar(position, experienceInfo);
            }

            // レベルアップ履歴を表示
            if (displayInfo.levelUpHistory.length > 0 && this.config.showLevelUpProcessingDebug) {
                this.drawLevelUpHistory(position, displayInfo.levelUpHistory);
            }
        }
    }

    /**
     * 経験値バーを描画
     */
    private drawExperienceBar(position: { x: number; y: number }, experienceInfo: ExperienceInfo): void {
        const barWidth = 100;
        const barHeight = 8;
        const x = position.x - barWidth / 2;
        const y = position.y - 30;

        // 背景
        this.debugGraphics.fillStyle(0x000000, 0.7);
        this.debugGraphics.fillRect(x, y, barWidth, barHeight);

        // 経験値バー
        const progress = experienceInfo.experienceProgress;
        this.debugGraphics.fillStyle(this.config.debugColors.experienceBar, 0.8);
        this.debugGraphics.fillRect(x, y, barWidth * progress, barHeight);

        // 枠線
        this.debugGraphics.lineStyle(1, 0xffffff, 0.8);
        this.debugGraphics.strokeRect(x, y, barWidth, barHeight);
    }

    /**
     * レベルアップ履歴を描画
     */
    private drawLevelUpHistory(position: { x: number; y: number }, history: LevelUpResult[]): void {
        const recent = history[history.length - 1];
        if (!recent) return;

        const x = position.x;
        const y = position.y - 50;

        // レベルアップ表示
        this.debugGraphics.fillStyle(this.config.debugColors.levelUp, 0.9);
        this.debugGraphics.fillCircle(x, y, 15);

        // レベル表示
        const levelText = this.scene.add.text(x, y, `${recent.newLevel}`, {
            fontSize: '12px',
            color: '#ffffff'
        });
        levelText.setOrigin(0.5);
        levelText.setDepth(1002);

        // 一定時間後に削除
        this.scene.time.delayedCall(3000, () => {
            levelText.destroy();
        });
    }

    /**
     * 経験値・レベルアップシミュレーションを実行
     */
    public async runExperienceSimulation(
        characterId: string,
        actions: { action: ExperienceAction; count: number }[],
        options: {
            duration?: number;
            logResults?: boolean;
            visualize?: boolean;
        } = {}
    ): Promise<SimulationResult> {
        if (this.isSimulationRunning) {
            throw new Error('Simulation already running');
        }

        this.isSimulationRunning = true;
        const startTime = Date.now();

        try {
            const initialInfo = this.experienceSystem.getExperienceInfo(characterId);
            let totalExperienceGained = 0;
            let levelUpsCount = 0;
            const statGrowthTotal: StatGrowthResult = {
                hp: 0, mp: 0, attack: 0, defense: 0, speed: 0, skill: 0, luck: 0
            };

            console.log(`Starting experience simulation for ${characterId}`);
            console.log(`Initial level: ${initialInfo.currentLevel}, EXP: ${initialInfo.currentExperience}`);

            // アクションを実行
            for (const { action, count } of actions) {
                for (let i = 0; i < count; i++) {
                    const context: ExperienceContext = {
                        source: this.mapActionToSource(action),
                        action,
                        timestamp: Date.now()
                    };

                    const result = this.experienceSystem.awardExperience(characterId, action, context);
                    if (result) {
                        totalExperienceGained += result.finalAmount;
                    }

                    // レベルアップチェック
                    const levelUpResult = this.experienceSystem.checkAndProcessLevelUp(characterId);
                    if (levelUpResult) {
                        levelUpsCount++;
                        this.addStatGrowth(statGrowthTotal, levelUpResult.statGrowth);

                        if (options.logResults) {
                            console.log(`Level up! ${levelUpResult.oldLevel} → ${levelUpResult.newLevel}`);
                        }
                    }

                    // 可視化
                    if (options.visualize && i % 10 === 0) {
                        await this.delay(50);
                    }
                }
            }

            const finalInfo = this.experienceSystem.getExperienceInfo(characterId);
            const simulationDuration = Date.now() - startTime;

            const result: SimulationResult = {
                characterId,
                initialLevel: initialInfo.currentLevel,
                finalLevel: finalInfo.currentLevel,
                totalExperienceGained,
                levelUpsCount,
                statGrowthTotal,
                simulationDuration
            };

            this.simulationResults.push(result);

            if (options.logResults) {
                console.log('Simulation completed:', result);
            }

            return result;

        } finally {
            this.isSimulationRunning = false;
        }
    }

    /**
     * バランス調整統計を生成
     */
    public generateBalanceStatistics(): BalanceStatistics {
        // アクション別平均経験値を計算
        Object.values(ExperienceAction).forEach(action => {
            const total = this.statistics.experienceByAction[action] || 0;
            // 簡略化: 実際の実行回数を追跡する必要がある
            this.balanceStatistics.averageExperiencePerAction[action] = total;
        });

        // 経験値源効率を計算
        Object.values(ExperienceSource).forEach(source => {
            const total = this.statistics.experienceBySource[source] || 0;
            this.balanceStatistics.experienceSourceEfficiency[source] = total;
        });

        // レベル進行曲線を生成
        this.balanceStatistics.levelProgressionCurve = this.generateLevelProgressionCurve();

        // 平均レベルアップ時間を計算
        this.balanceStatistics.averageLevelUpTime = this.calculateAverageLevelUpTime();

        return this.balanceStatistics;
    }

    /**
     * パフォーマンス統計を取得
     */
    public getPerformanceStatistics(): Record<string, {
        average: number;
        min: number;
        max: number;
        count: number;
    }> {
        const stats: Record<string, any> = {};

        for (const [metric, values] of this.performanceMetrics) {
            if (values.length === 0) continue;

            stats[metric] = {
                average: values.reduce((a, b) => a + b, 0) / values.length,
                min: Math.min(...values),
                max: Math.max(...values),
                count: values.length
            };
        }

        return stats;
    }

    /**
     * デバッグ情報をエクスポート
     */
    public exportDebugData(): {
        statistics: ExperienceStatistics;
        balanceStatistics: BalanceStatistics;
        simulationResults: SimulationResult[];
        performanceMetrics: Record<string, any>;
        logHistory: string[];
    } {
        return {
            statistics: this.statistics,
            balanceStatistics: this.generateBalanceStatistics(),
            simulationResults: this.simulationResults,
            performanceMetrics: this.getPerformanceStatistics(),
            logHistory: this.logHistory.slice(-100) // 最新100件
        };
    }

    /**
     * デバッグデータをクリア
     */
    public clearDebugData(): void {
        this.statistics = {
            totalExperienceGained: 0,
            experienceBySource: {} as Record<ExperienceSource, number>,
            experienceByAction: {} as Record<ExperienceAction, number>,
            totalLevelUps: 0,
            averageStatGrowth: {
                hp: 0, mp: 0, attack: 0, defense: 0, speed: 0, skill: 0, luck: 0
            },
            sessionStartTime: Date.now(),
            sessionDuration: 0
        };

        this.simulationResults = [];
        this.performanceMetrics.clear();
        this.logHistory = [];
        this.debugDisplays.clear();

        console.log('Experience debug data cleared');
    }

    /**
     * デバッグ表示の有効/無効を切り替え
     */
    public toggleDebugDisplay(): void {
        const newState = !this.config.enableExperienceDebug;

        const gameConfig = new GameConfig();
        gameConfig.updateExperienceSystemConfig({
            enableExperienceDebug: newState
        });

        console.log(`Experience debug display ${newState ? 'enabled' : 'disabled'}`);
    }

    // ===== プライベートヘルパーメソッド =====

    private mapActionToSource(action: ExperienceAction): ExperienceSource {
        switch (action) {
            case ExperienceAction.ATTACK:
                return ExperienceSource.ATTACK_HIT;
            case ExperienceAction.DEFEAT:
                return ExperienceSource.ENEMY_DEFEAT;
            case ExperienceAction.HEAL:
                return ExperienceSource.HEALING;
            case ExperienceAction.SUPPORT:
                return ExperienceSource.ALLY_SUPPORT;
            default:
                return ExperienceSource.ATTACK_HIT;
        }
    }

    private updateAverageStatGrowth(growth: StatGrowthResult): void {
        const count = this.statistics.totalLevelUps;
        const avg = this.statistics.averageStatGrowth;

        avg.hp = (avg.hp * (count - 1) + growth.hp) / count;
        avg.mp = (avg.mp * (count - 1) + growth.mp) / count;
        avg.attack = (avg.attack * (count - 1) + growth.attack) / count;
        avg.defense = (avg.defense * (count - 1) + growth.defense) / count;
        avg.speed = (avg.speed * (count - 1) + growth.speed) / count;
        avg.skill = (avg.skill * (count - 1) + growth.skill) / count;
        avg.luck = (avg.luck * (count - 1) + growth.luck) / count;
    }

    private addStatGrowth(total: StatGrowthResult, growth: StatGrowthResult): void {
        total.hp += growth.hp;
        total.mp += growth.mp;
        total.attack += growth.attack;
        total.defense += growth.defense;
        total.speed += growth.speed;
        total.skill += growth.skill;
        total.luck += growth.luck;
    }

    private recordPerformanceMetric(metric: string, value: number): void {
        if (!this.performanceMetrics.has(metric)) {
            this.performanceMetrics.set(metric, []);
        }

        const values = this.performanceMetrics.get(metric)!;
        values.push(value);

        // 最大1000件まで保持
        if (values.length > 1000) {
            values.shift();
        }
    }

    private addToLogHistory(message: string): void {
        this.logHistory.push(`[${new Date().toISOString()}] ${message}`);

        if (this.logHistory.length > this.maxLogHistory) {
            this.logHistory.shift();
        }
    }

    private generateLevelProgressionCurve(): number[] {
        // 簡略化された実装
        const curve: number[] = [];
        for (let level = 1; level <= this.config.balanceSettings.maxLevel; level++) {
            curve.push(Math.pow(level, 2) * 100);
        }
        return curve;
    }

    private calculateAverageLevelUpTime(): number {
        // 簡略化された実装
        return this.statistics.sessionDuration / Math.max(this.statistics.totalLevelUps, 1);
    }

    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * リソースを解放
     */
    public destroy(): void {
        if (this.debugGraphics) {
            this.debugGraphics.destroy();
        }
        if (this.debugText) {
            this.debugText.destroy();
        }

        this.debugDisplays.clear();
        this.performanceMetrics.clear();
        this.logHistory = [];

        console.log('ExperienceDebugManager destroyed');
    }
}