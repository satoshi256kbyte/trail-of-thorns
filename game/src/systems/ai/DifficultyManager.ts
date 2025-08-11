/**
 * 難易度調整システム
 * AIの思考深度、ランダム要素、ミス確率などを動的に調整する
 */

import { DifficultySettings, DifficultyLevel, AIContext, Unit } from '../../types/ai';

/**
 * プレイヤーレベル情報
 */
export interface PlayerLevelInfo {
    /** 平均レベル */
    averageLevel: number;
    /** 最高レベル */
    maxLevel: number;
    /** 最低レベル */
    minLevel: number;
    /** パーティサイズ */
    partySize: number;
}

/**
 * 動的難易度調整設定
 */
export interface AdaptiveDifficultyConfig {
    /** 有効化フラグ */
    enabled: boolean;
    /** 調整レート（0-1） */
    adjustmentRate: number;
    /** パフォーマンス監視ウィンドウ（ターン数） */
    performanceWindow: number;
    /** 目標勝率（0-1） */
    targetWinRate: number;
    /** 最小難易度レベル */
    minDifficultyLevel: DifficultyLevel;
    /** 最大難易度レベル */
    maxDifficultyLevel: DifficultyLevel;
}

/**
 * パフォーマンス統計
 */
export interface PerformanceStats {
    /** 勝利回数 */
    wins: number;
    /** 敗北回数 */
    losses: number;
    /** 平均戦闘時間（ターン数） */
    averageBattleLength: number;
    /** プレイヤーダメージ受領率 */
    playerDamageRate: number;
    /** AI行動成功率 */
    aiSuccessRate: number;
}

/**
 * 難易度管理システム
 */
export class DifficultyManager {
    private currentDifficulty: DifficultyLevel = DifficultyLevel.NORMAL;
    private currentSettings: DifficultySettings;
    private baseDifficultySettings: Map<DifficultyLevel, DifficultySettings>;
    private adaptiveConfig: AdaptiveDifficultyConfig;
    private performanceHistory: PerformanceStats[] = [];
    private playerLevelScaling: boolean = true;
    private scalingFactor: number = 0.1;
    private maxScaling: number = 2.0;
    private minScaling: number = 0.5;

    constructor() {
        this.initializeBaseDifficultySettings();
        this.initializeAdaptiveConfig();
        this.currentSettings = this.baseDifficultySettings.get(this.currentDifficulty)!;
    }

    /**
     * 基本難易度設定を初期化
     */
    private initializeBaseDifficultySettings(): void {
        this.baseDifficultySettings = new Map([
            [DifficultyLevel.EASY, {
                thinkingDepth: 2,
                randomnessFactor: 0.4,
                mistakeProbability: 0.2,
                reactionTime: 1500,
                skillUsageFrequency: 0.5,
                thinkingTimeLimit: 2000
            }],
            [DifficultyLevel.NORMAL, {
                thinkingDepth: 3,
                randomnessFactor: 0.2,
                mistakeProbability: 0.1,
                reactionTime: 1000,
                skillUsageFrequency: 0.7,
                thinkingTimeLimit: 2000
            }],
            [DifficultyLevel.HARD, {
                thinkingDepth: 4,
                randomnessFactor: 0.1,
                mistakeProbability: 0.05,
                reactionTime: 500,
                skillUsageFrequency: 0.8,
                thinkingTimeLimit: 2000
            }],
            [DifficultyLevel.EXPERT, {
                thinkingDepth: 5,
                randomnessFactor: 0.05,
                mistakeProbability: 0.02,
                reactionTime: 200,
                skillUsageFrequency: 0.9,
                thinkingTimeLimit: 2000
            }],
            [DifficultyLevel.MASTER, {
                thinkingDepth: 5,
                randomnessFactor: 0.02,
                mistakeProbability: 0.01,
                reactionTime: 100,
                skillUsageFrequency: 0.95,
                thinkingTimeLimit: 2000
            }]
        ]);
    }

    /**
     * 動的難易度調整設定を初期化
     */
    private initializeAdaptiveConfig(): void {
        this.adaptiveConfig = {
            enabled: false,
            adjustmentRate: 0.1,
            performanceWindow: 10,
            targetWinRate: 0.6,
            minDifficultyLevel: DifficultyLevel.EASY,
            maxDifficultyLevel: DifficultyLevel.MASTER
        };
    }

    /**
     * 難易度レベルを設定
     */
    setDifficultyLevel(level: DifficultyLevel): void {
        if (!Object.values(DifficultyLevel).includes(level)) {
            console.warn(`Invalid difficulty level: ${level}`);
            return;
        }

        this.currentDifficulty = level;
        this.updateCurrentSettings();

        console.log(`Difficulty level set to: ${DifficultyLevel[level]}`);
    }

    /**
     * 現在の難易度レベルを取得
     */
    getCurrentDifficultyLevel(): DifficultyLevel {
        return this.currentDifficulty;
    }

    /**
     * 現在の難易度設定を取得
     */
    getCurrentSettings(): DifficultySettings {
        return { ...this.currentSettings };
    }

    /**
     * 思考深度を設定
     */
    setThinkingDepth(depth: number): void {
        if (depth < 1 || depth > 5) {
            console.warn(`Invalid thinking depth: ${depth}. Must be between 1 and 5.`);
            return;
        }

        this.currentSettings.thinkingDepth = depth;
        console.log(`Thinking depth set to: ${depth}`);
    }

    /**
     * ランダム要素を設定
     */
    setRandomnessFactor(factor: number): void {
        if (factor < 0 || factor > 1) {
            console.warn(`Invalid randomness factor: ${factor}. Must be between 0 and 1.`);
            return;
        }

        this.currentSettings.randomnessFactor = factor;
        console.log(`Randomness factor set to: ${factor}`);
    }

    /**
     * ミス確率を設定
     */
    setMistakeProbability(probability: number): void {
        if (probability < 0 || probability > 1) {
            console.warn(`Invalid mistake probability: ${probability}. Must be between 0 and 1.`);
            return;
        }

        this.currentSettings.mistakeProbability = probability;
        console.log(`Mistake probability set to: ${probability}`);
    }

    /**
     * スキル使用頻度を設定
     */
    setSkillUsageFrequency(frequency: number): void {
        if (frequency < 0 || frequency > 1) {
            console.warn(`Invalid skill usage frequency: ${frequency}. Must be between 0 and 1.`);
            return;
        }

        this.currentSettings.skillUsageFrequency = frequency;
        console.log(`Skill usage frequency set to: ${frequency}`);
    }

    /**
     * プレイヤーレベルに応じた動的難易度調整
     */
    adjustForPlayerLevel(playerLevelInfo: PlayerLevelInfo): DifficultySettings {
        if (!this.playerLevelScaling) {
            return this.currentSettings;
        }

        const levelFactor = this.calculateLevelScalingFactor(playerLevelInfo);
        const adjustedSettings = { ...this.currentSettings };

        // 思考深度の調整（レベルが高いほど深く考える）
        const depthAdjustment = Math.floor(levelFactor * 2);
        adjustedSettings.thinkingDepth = Math.min(5, Math.max(1,
            this.currentSettings.thinkingDepth + depthAdjustment));

        // ランダム要素の調整（レベルが高いほど最適解に近づく）
        adjustedSettings.randomnessFactor = Math.max(0.01,
            this.currentSettings.randomnessFactor * (2 - levelFactor));

        // ミス確率の調整（レベルが高いほどミスが少なくなる）
        adjustedSettings.mistakeProbability = Math.max(0.001,
            this.currentSettings.mistakeProbability * (2 - levelFactor));

        // スキル使用頻度の調整（レベルが高いほど戦略的にスキルを使用）
        adjustedSettings.skillUsageFrequency = Math.min(0.95,
            this.currentSettings.skillUsageFrequency * levelFactor);

        // 反応時間の調整（レベルが高いほど素早く反応）
        adjustedSettings.reactionTime = Math.max(100,
            this.currentSettings.reactionTime * (2 - levelFactor));

        return adjustedSettings;
    }

    /**
     * レベルスケーリング係数を計算
     */
    private calculateLevelScalingFactor(playerLevelInfo: PlayerLevelInfo): number {
        // 平均レベルを基準にスケーリング係数を計算
        const baseLevel = 10; // 基準レベル
        const levelRatio = playerLevelInfo.averageLevel / baseLevel;

        // パーティサイズも考慮（大きなパーティほど強い）
        const partySizeFactor = Math.min(1.5, playerLevelInfo.partySize / 4);

        // 最終的なスケーリング係数
        const scalingFactor = 1 + (levelRatio - 1) * this.scalingFactor * partySizeFactor;

        return Math.min(this.maxScaling, Math.max(this.minScaling, scalingFactor));
    }

    /**
     * 動的難易度調整を有効化/無効化
     */
    setAdaptiveDifficulty(enabled: boolean): void {
        this.adaptiveConfig.enabled = enabled;
        console.log(`Adaptive difficulty ${enabled ? 'enabled' : 'disabled'}`);
    }

    /**
     * 動的難易度調整設定を更新
     */
    updateAdaptiveConfig(config: Partial<AdaptiveDifficultyConfig>): void {
        this.adaptiveConfig = { ...this.adaptiveConfig, ...config };
        console.log('Adaptive difficulty config updated:', config);
    }

    /**
     * パフォーマンス統計を記録
     */
    recordPerformance(stats: PerformanceStats): void {
        this.performanceHistory.push(stats);

        // 履歴サイズを制限
        if (this.performanceHistory.length > this.adaptiveConfig.performanceWindow * 2) {
            this.performanceHistory = this.performanceHistory.slice(-this.adaptiveConfig.performanceWindow);
        }

        // 動的調整が有効な場合、難易度を調整
        if (this.adaptiveConfig.enabled) {
            this.performAdaptiveDifficultyAdjustment();
        }
    }

    /**
     * 動的難易度調整を実行
     */
    private performAdaptiveDifficultyAdjustment(): void {
        if (this.performanceHistory.length < this.adaptiveConfig.performanceWindow) {
            return; // データが不十分
        }

        const recentStats = this.performanceHistory.slice(-this.adaptiveConfig.performanceWindow);
        const totalGames = recentStats.reduce((sum, stats) => sum + stats.wins + stats.losses, 0);
        const totalWins = recentStats.reduce((sum, stats) => sum + stats.wins, 0);

        if (totalGames === 0) return;

        const currentWinRate = totalWins / totalGames;
        const targetWinRate = this.adaptiveConfig.targetWinRate;
        const adjustmentRate = this.adaptiveConfig.adjustmentRate;

        // 勝率が目標より高い場合は難易度を上げ、低い場合は下げる
        if (Math.abs(currentWinRate - targetWinRate) > 0.1) {
            const adjustment = (currentWinRate - targetWinRate) * adjustmentRate;
            this.adjustDifficultyByFactor(adjustment);

            console.log(`Adaptive difficulty adjustment: winRate=${currentWinRate.toFixed(2)}, adjustment=${adjustment.toFixed(2)}`);
        }
    }

    /**
     * 係数による難易度調整
     */
    private adjustDifficultyByFactor(factor: number): void {
        // 思考深度の調整
        if (factor > 0 && this.currentSettings.thinkingDepth < 5) {
            this.currentSettings.thinkingDepth = Math.min(5, this.currentSettings.thinkingDepth + 1);
        } else if (factor < 0 && this.currentSettings.thinkingDepth > 1) {
            this.currentSettings.thinkingDepth = Math.max(1, this.currentSettings.thinkingDepth - 1);
        }

        // ランダム要素の調整
        const randomnessAdjustment = -factor * 0.1;
        this.currentSettings.randomnessFactor = Math.min(1, Math.max(0.01,
            this.currentSettings.randomnessFactor + randomnessAdjustment));

        // ミス確率の調整
        const mistakeAdjustment = -factor * 0.05;
        this.currentSettings.mistakeProbability = Math.min(0.5, Math.max(0.001,
            this.currentSettings.mistakeProbability + mistakeAdjustment));

        // スキル使用頻度の調整
        const skillAdjustment = factor * 0.1;
        this.currentSettings.skillUsageFrequency = Math.min(0.95, Math.max(0.1,
            this.currentSettings.skillUsageFrequency + skillAdjustment));
    }

    /**
     * プレイヤーレベルスケーリングを設定
     */
    setPlayerLevelScaling(enabled: boolean, scalingFactor?: number, maxScaling?: number, minScaling?: number): void {
        this.playerLevelScaling = enabled;

        if (scalingFactor !== undefined) {
            this.scalingFactor = Math.min(1, Math.max(0, scalingFactor));
        }

        if (maxScaling !== undefined) {
            this.maxScaling = Math.max(1, maxScaling);
        }

        if (minScaling !== undefined) {
            this.minScaling = Math.min(1, Math.max(0.1, minScaling));
        }

        console.log(`Player level scaling ${enabled ? 'enabled' : 'disabled'}`);
        if (enabled) {
            console.log(`Scaling factor: ${this.scalingFactor}, Max: ${this.maxScaling}, Min: ${this.minScaling}`);
        }
    }

    /**
     * 難易度設定をリアルタイムで変更
     */
    updateSettings(partialSettings: Partial<DifficultySettings>): void {
        // 設定値の検証
        if (partialSettings.thinkingDepth !== undefined) {
            if (partialSettings.thinkingDepth < 1 || partialSettings.thinkingDepth > 5) {
                console.warn(`Invalid thinking depth: ${partialSettings.thinkingDepth}`);
                delete partialSettings.thinkingDepth;
            }
        }

        if (partialSettings.randomnessFactor !== undefined) {
            if (partialSettings.randomnessFactor < 0 || partialSettings.randomnessFactor > 1) {
                console.warn(`Invalid randomness factor: ${partialSettings.randomnessFactor}`);
                delete partialSettings.randomnessFactor;
            }
        }

        if (partialSettings.mistakeProbability !== undefined) {
            if (partialSettings.mistakeProbability < 0 || partialSettings.mistakeProbability > 1) {
                console.warn(`Invalid mistake probability: ${partialSettings.mistakeProbability}`);
                delete partialSettings.mistakeProbability;
            }
        }

        if (partialSettings.skillUsageFrequency !== undefined) {
            if (partialSettings.skillUsageFrequency < 0 || partialSettings.skillUsageFrequency > 1) {
                console.warn(`Invalid skill usage frequency: ${partialSettings.skillUsageFrequency}`);
                delete partialSettings.skillUsageFrequency;
            }
        }

        // 設定を更新
        this.currentSettings = { ...this.currentSettings, ...partialSettings };
        console.log('Difficulty settings updated:', partialSettings);
    }

    /**
     * 現在の設定を基本設定に保存
     */
    saveCurrentAsBase(): void {
        this.baseDifficultySettings.set(this.currentDifficulty, { ...this.currentSettings });
        console.log(`Current settings saved as base for ${DifficultyLevel[this.currentDifficulty]}`);
    }

    /**
     * 基本設定にリセット
     */
    resetToBase(): void {
        const baseSettings = this.baseDifficultySettings.get(this.currentDifficulty);
        if (baseSettings) {
            this.currentSettings = { ...baseSettings };
            console.log(`Settings reset to base for ${DifficultyLevel[this.currentDifficulty]}`);
        }
    }

    /**
     * 現在の設定を更新（内部用）
     */
    private updateCurrentSettings(): void {
        const baseSettings = this.baseDifficultySettings.get(this.currentDifficulty);
        if (baseSettings) {
            this.currentSettings = { ...baseSettings };
        }
    }

    /**
     * 特定のコンテキストに対する調整済み設定を取得
     */
    getAdjustedSettings(context: AIContext): DifficultySettings {
        let adjustedSettings = { ...this.currentSettings };

        // プレイヤーレベル情報が利用可能な場合は調整
        if (context.gameState && context.gameState.playerUnits) {
            const playerLevelInfo = this.extractPlayerLevelInfo(context.gameState.playerUnits);
            adjustedSettings = this.adjustForPlayerLevel(playerLevelInfo);
        }

        // ターン数による調整（ゲーム進行に応じて戦術的思考が向上）
        if (context.turnNumber > 10) {
            const turnFactor = Math.min(1.5, 1 + (context.turnNumber - 10) * 0.02);
            adjustedSettings.thinkingDepth = Math.min(5,
                Math.floor(adjustedSettings.thinkingDepth * turnFactor));
            adjustedSettings.skillUsageFrequency = Math.min(0.95,
                adjustedSettings.skillUsageFrequency * turnFactor);
        }

        return adjustedSettings;
    }

    /**
     * プレイヤーレベル情報を抽出
     */
    private extractPlayerLevelInfo(playerUnits: Unit[]): PlayerLevelInfo {
        if (!playerUnits || playerUnits.length === 0) {
            return {
                averageLevel: 1,
                maxLevel: 1,
                minLevel: 1,
                partySize: 0
            };
        }

        const levels = playerUnits.map(unit => unit.level || 1);
        const totalLevel = levels.reduce((sum, level) => sum + level, 0);

        return {
            averageLevel: totalLevel / levels.length,
            maxLevel: Math.max(...levels),
            minLevel: Math.min(...levels),
            partySize: playerUnits.length
        };
    }

    /**
     * 統計情報を取得
     */
    getStatistics(): {
        currentDifficulty: DifficultyLevel;
        currentSettings: DifficultySettings;
        adaptiveConfig: AdaptiveDifficultyConfig;
        performanceHistory: PerformanceStats[];
        playerLevelScaling: boolean;
    } {
        return {
            currentDifficulty: this.currentDifficulty,
            currentSettings: { ...this.currentSettings },
            adaptiveConfig: { ...this.adaptiveConfig },
            performanceHistory: [...this.performanceHistory],
            playerLevelScaling: this.playerLevelScaling
        };
    }

    /**
     * 設定をJSONとしてエクスポート
     */
    exportSettings(): string {
        return JSON.stringify({
            currentDifficulty: this.currentDifficulty,
            currentSettings: this.currentSettings,
            baseDifficultySettings: Object.fromEntries(this.baseDifficultySettings),
            adaptiveConfig: this.adaptiveConfig,
            playerLevelScaling: this.playerLevelScaling,
            scalingFactor: this.scalingFactor,
            maxScaling: this.maxScaling,
            minScaling: this.minScaling
        }, null, 2);
    }

    /**
     * JSONから設定をインポート
     */
    importSettings(jsonString: string): boolean {
        try {
            const settings = JSON.parse(jsonString);

            if (settings.currentDifficulty !== undefined) {
                this.currentDifficulty = settings.currentDifficulty;
            }

            if (settings.currentSettings) {
                this.currentSettings = settings.currentSettings;
            }

            if (settings.baseDifficultySettings) {
                this.baseDifficultySettings = new Map(Object.entries(settings.baseDifficultySettings));
            }

            if (settings.adaptiveConfig) {
                this.adaptiveConfig = settings.adaptiveConfig;
            }

            if (settings.playerLevelScaling !== undefined) {
                this.playerLevelScaling = settings.playerLevelScaling;
            }

            if (settings.scalingFactor !== undefined) {
                this.scalingFactor = settings.scalingFactor;
            }

            if (settings.maxScaling !== undefined) {
                this.maxScaling = settings.maxScaling;
            }

            if (settings.minScaling !== undefined) {
                this.minScaling = settings.minScaling;
            }

            console.log('Difficulty settings imported successfully');
            return true;
        } catch (error) {
            console.error('Failed to import difficulty settings:', error);
            return false;
        }
    }
}

// シングルトンインスタンス
export const difficultyManager = new DifficultyManager();